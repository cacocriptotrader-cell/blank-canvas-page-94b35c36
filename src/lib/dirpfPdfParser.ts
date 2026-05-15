import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { Asset, AssetCategory, Liability, LiabilityCategory } from "@/lib/store";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export class DirpfPdfParseError extends Error {
  constructor(
    message: string,
    public readonly code: "NO_TEXT_LAYER" | "READ_ERROR",
  ) {
    super(message);
    this.name = "DirpfPdfParseError";
  }
}

export interface ParsedDirpfPatrimony {
  assets: Asset[];
  liabilities: Liability[];
}

interface TextItemLike {
  str?: string;
  transform?: number[];
}

const SECTION_STOPS = [
  "Rendimentos",
  "Pagamentos",
  "Doações",
  "Espólio",
  "Resumo",
  "Demonstrativo",
  "Informações",
  "Identificação",
  "Dependentes",
  "Alimentandos",
  "Atividade Rural",
  "Ganhos de Capital",
];

const ASSET_CATEGORY_HINTS: Array<[RegExp, AssetCategory]> = [
  [/\b(apartamento|casa|terreno|im[oó]vel|sala|galp[aã]o|fazenda|lote)\b/i, "Imóvel"],
  [/\b(ve[ií]culo|autom[oó]vel|carro|moto|caminhonete|embarca[cç][aã]o|aeronave)\b/i, "Veículo"],
  [/\b(cdb|rdb|lci|lca|cri|cra|tesouro|poupan[cç]a|deb[eê]nture|renda fixa|t[ií]tulo)\b/i, "Renda Fixa"],
  [/\b(a[cç][oõ]es|fii|fundo imobili[aá]rio|etf|bdr|bolsa|renda vari[aá]vel|quotas?|fundo de investimento)\b/i, "Renda Variável"],
  [/\b(cons[oó]rcio)\b/i, "Consórcio"],
  [/\b(bitcoin|btc|ethereum|eth|cripto|criptoativo|usdt|usdc|solana|sol)\b/i, "Cripto"],
];

const LIABILITY_CATEGORY_HINTS: Array<[RegExp, LiabilityCategory]> = [
  [/\b(imobili[aá]rio|im[oó]vel|hipotec|habitacional|sbpe|sac)\b/i, "Financiamento Imobiliário"],
  [/\b(ve[ií]culo|autom[oó]vel|carro|moto|cdc)\b/i, "Financiamento Veículo"],
  [/\b(cons[oó]rcio)\b/i, "Consórcio"],
];

const uid = () => Math.random().toString(36).slice(2, 10);

export async function parseDirpfPdf(file: File): Promise<ParsedDirpfPatrimony> {
  try {
    let data: ArrayBuffer;
    try {
      data = await file.arrayBuffer();
    } catch (error) {
      console.error("[DIRPF PDF] Falha ao ler ArrayBuffer", error);
      throw new DirpfPdfParseError("Não foi possível ler o arquivo enviado. Tente selecionar o PDF novamente.", "READ_ERROR");
    }

    let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;
    try {
      pdf = await pdfjsLib.getDocument({ data }).promise;
    } catch (error) {
      console.error("[DIRPF PDF] Falha ao carregar documento PDF", error);
      throw new DirpfPdfParseError("Não foi possível abrir este PDF. Verifique se o arquivo não está corrompido.", "READ_ERROR");
    }

    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      try {
        const page = await pdf.getPage(pageNumber);
        pageTexts.push(await extractPageText(page));
      } catch (error) {
        console.warn(`[DIRPF PDF] Falha ao extrair texto da página ${pageNumber}`, error);
        pageTexts.push("");
      }
    }

    const text = pageTexts.join("\n").replace(/\u00a0/g, " ").trim();
    if (text.replace(/\s+/g, "").length < 80) {
      throw new DirpfPdfParseError(
        "Não foi possível ler texto deste PDF. Ele pode ser uma imagem/scanner.",
        "NO_TEXT_LAYER",
      );
    }

    const latestYear = findLatestSituationYear(text);
    const assets = parseAssets(extractSection(text, /Bens\s+e\s+Direitos/i, /D[ií]vidas\s+e\s+[ÔO]nus\s+Reais/i), latestYear);
    const liabilities = parseLiabilities(extractSection(text, /D[ií]vidas\s+e\s+[ÔO]nus\s+Reais/i), latestYear);

    return { assets, liabilities };
  } catch (error) {
    console.error("[DIRPF PDF] Falha ao processar DIRPF", error);
    if (error instanceof DirpfPdfParseError) throw error;
    throw new DirpfPdfParseError("Erro ao ler arquivo. Formato não suportado ou corrompido.", "READ_ERROR");
  }
}

async function extractPageText(page: { getTextContent: () => Promise<{ items: TextItemLike[] }> }) {
  const content = await page.getTextContent();
  const positioned = content.items
    .map((item) => ({
      text: String(item.str ?? "").trim(),
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))
    .filter((item) => item.text.length > 0)
    .sort((a, b) => (Math.abs(b.y - a.y) > 3 ? b.y - a.y : a.x - b.x));

  const lines: Array<{ y: number; chunks: string[] }> = [];
  for (const item of positioned) {
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 3);
    if (line) {
      line.chunks.push(item.text);
    } else {
      lines.push({ y: item.y, chunks: [item.text] });
    }
  }

  return lines.map((line) => line.chunks.join(" ")).join("\n");
}

function findLatestSituationYear(text: string) {
  const years = [...text.matchAll(/Situa[çc][aã]o\s+em\s+31\/12\/(\d{4})/gi)]
    .map((match) => Number(match[1]))
    .filter((year) => Number.isFinite(year));

  return years.length > 0 ? Math.max(...years) : undefined;
}

function extractSection(text: string, startPattern: RegExp, preferredEndPattern?: RegExp) {
  const startMatch = startPattern.exec(text);
  if (!startMatch || startMatch.index < 0) return "";

  const afterStart = text.slice(startMatch.index + startMatch[0].length);
  const endIndexes = [
    preferredEndPattern?.exec(afterStart)?.index,
    ...SECTION_STOPS.map((label) => new RegExp(`\\n\\s*${escapeRegExp(label)}\\b`, "i").exec(afterStart)?.index),
  ].filter((index): index is number => typeof index === "number" && index > 0);

  return endIndexes.length > 0 ? afterStart.slice(0, Math.min(...endIndexes)) : afterStart;
}

function parseAssets(section: string, latestYear?: number): Asset[] {
  return splitItemBlocks(section)
    .map((block) => {
      try {
        const value = extractSituationValue(block, latestYear);
        const description = extractDescription(block);
        if (!description || value <= 0) return null;

        return {
          id: uid(),
          category: classifyAsset(block),
          description,
          currentValue: value,
        } satisfies Asset;
      } catch {
        return null;
      }
    })
    .filter((asset): asset is Asset => Boolean(asset));
}

function parseLiabilities(section: string, latestYear?: number): Liability[] {
  return splitItemBlocks(section)
    .map((block) => {
      try {
        const value = extractSituationValue(block, latestYear);
        const description = extractDescription(block);
        if (!description || value <= 0) return null;

        return {
          id: uid(),
          category: classifyLiability(block),
          description,
          totalAmount: value,
          remainingBalance: value,
          interestRate: 0,
        } satisfies Liability;
      } catch {
        return null;
      }
    })
    .filter((liability): liability is Liability => Boolean(liability));
}

function splitItemBlocks(section: string) {
  const normalized = section.replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
  const starts = [...normalized.matchAll(/(?:^|\n)\s*(?:Grupo|C[oó]digo|Discrimina[çc][aã]o)\b/gi)].map((match) => match.index ?? 0);

  if (starts.length === 0) return [];

  return starts
    .map((start, index) => normalized.slice(start, starts[index + 1] ?? normalized.length).trim())
    .filter((block) => /Situa[çc][aã]o\s+em\s+31\/12\/\d{4}/i.test(block) || /R\$\s*\d/i.test(block));
}

function extractDescription(block: string) {
  const descriptionMatch = /Discrimina[çc][aã]o\s*[:\-]?\s*([\s\S]*?)(?=\n\s*(?:Situa[çc][aã]o|Localiza[çc][aã]o|Grupo|C[oó]digo|Renavam|CNPJ|CPF)\b|$)/i.exec(block);
  const fallbackMatch = /(?:Grupo|C[oó]digo)\s+[^\n]*\n([\s\S]*?)(?=\n\s*Situa[çc][aã]o|$)/i.exec(block);
  const raw = descriptionMatch?.[1] ?? fallbackMatch?.[1] ?? "";

  return raw
    .replace(/\b(Renavam|CNPJ|CPF|Banco|Ag[eê]ncia|Conta)\b[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function extractSituationValue(block: string, latestYear?: number) {
  const targetYearPattern = latestYear ? String(latestYear) : "\\d{4}";
  const directPattern = new RegExp(`Situa[çc][aã]o\\s+em\\s+31\\/12\\/${targetYearPattern}\\s*(?:R\\$)?\\s*([\\d.]+,\\d{2}|\\d+)`, "i");
  const direct = directPattern.exec(block);
  if (direct?.[1]) return parseBrazilianMoney(direct[1]);

  const situations = [...block.matchAll(/Situa[çc][aã]o\s+em\s+31\/12\/(\d{4})\s*(?:R\$)?\s*([\d.]+,\d{2}|\d+)/gi)];
  const best = situations
    .map((match) => ({ year: Number(match[1]), value: parseBrazilianMoney(match[2] ?? "") }))
    .filter((item) => Number.isFinite(item.year) && item.value > 0)
    .sort((a, b) => b.year - a.year)[0];

  if (best) return best.value;

  const values = [...block.matchAll(/R\$\s*([\d.]+,\d{2})/g)].map((match) => parseBrazilianMoney(match[1] ?? ""));
  return values.at(-1) ?? 0;
}

function parseBrazilianMoney(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function classifyAsset(block: string): AssetCategory {
  return ASSET_CATEGORY_HINTS.find(([pattern]) => pattern.test(block))?.[1] ?? "Renda Fixa";
}

function classifyLiability(block: string): LiabilityCategory {
  return LIABILITY_CATEGORY_HINTS.find(([pattern]) => pattern.test(block))?.[1] ?? "Empréstimo";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
