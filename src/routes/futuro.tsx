import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  brl,
  useStore,
  monthlyFixedTotal,
  monthlyFixedIncomeNet,
  globalIncomeMonthly,
  isAboveIRPFExemption,
  IRPF_EXEMPTION_MONTHLY,
  estimateAnnualIRPF2026,
  calculatePGBLAdvantage,
  isPJFocused,
} from "@/lib/store";
import { Section } from "@/components/Section";
import {
  Sparkles, Target, TrendingUp, Info, Flame, Skull, ShieldCheck, CheckCircle2, Landmark, Wallet, Home, Lock,
} from "lucide-react";
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from "@/components/ui/tooltip";
import { Stethoscope, Scissors, Zap, Crown } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const nf0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const compact = (n: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const Route = createFileRoute("/futuro")({
  head: () => ({
    meta: [
      { title: "Futuro — Previdência & Wealth | Docfin" },
      { name: "description", content: "PGBL vs VGBL, amortização vs investir, simulador de independência e meta casamento." },
    ],
  }),
  component: Future,
});

function Future() {
  return (
    <>
      <SmartAllocator />
      <FireSimulator />
      <TaxSimulator />
    </>
  );
}

// =================== SMART ALLOCATOR ===================
function PGBLInsightCard() {
  const store = useStore();
  const pgblAdvantage = calculatePGBLAdvantage(store);

  if (!pgblAdvantage.hasAdvantage && !pgblAdvantage.isPJOnly) {
    return null; // Não mostra o card se não há vantagem e não é focado em PJ
  }

  return (
    <div className="mt-8 p-4 bg-gradient-to-br from-emerald-900/50 to-zinc-900/50 border border-emerald-500/20 rounded-xl shadow-lg">
      <div className="flex items-center gap-3 mb-3">
        <Sparkles className="h-5 w-5 text-emerald-400" />
        <h3 className="text-lg font-semibold text-emerald-300">Insight: Otimização PGBL</h3>
      </div>
      <p className="text-zinc-200 text-sm leading-relaxed">
        {pgblAdvantage.isPJOnly ? (
          <>Como a sua operação é focada em PJ (lucros isentos), o PGBL não traz benefício fiscal. Concentre os seus aportes em CDB/LCI.</>
        ) : (
          <>Com o seu volume de plantões RPA/CLT, investir até <strong className="text-emerald-300">{brl(pgblAdvantage.idealLimit)}</strong> em PGBL este ano garante uma restituição de <strong className="text-emerald-300">{brl(pgblAdvantage.taxSavings)}</strong>. Para valores acima disso, utilize CDB.</>
        )}
      </p>
    </div>
  );
}

function SmartAllocator() {
  const store = useStore();
  const global = globalIncomeMonthly(store);
  const pgblEligible = isAboveIRPFExemption(store);
  const suggestedFree = Math.max(
    0,
    Math.round(
      (global > 0 ? global : monthlyFixedIncomeNet(store)) - monthlyFixedTotal(store),
    ),
  );
  const [free, setFree] = useState<number>(suggestedFree > 0 ? suggestedFree : 5000);

  // Pesos brutos de cada bucket; normalizamos para 100% na renderização.
  // Se PGBL não for elegível, começa com 0 nesse bucket e o slider fica trancado.
  const [w, setW] = useState<[number, number, number]>(
    pgblEligible ? [40, 35, 25] : [0, 60, 40],
  );

  const total = w[0] + w[1] + w[2] || 1;
  const pct: [number, number, number] = [w[0] / total, w[1] / total, w[2] / total];
  const values: [number, number, number] = [free * pct[0], free * pct[1], free * pct[2]];

  const setBucket = (i: 0 | 1 | 2, v: number) => {
    if (i === 0 && !pgblEligible) return;
    const next: [number, number, number] = [...w] as [number, number, number];
    next[i] = v;
    setW(next);
  };

  // Impacto da amortização: usa a maior taxa de dívida cadastrada (ou fallback 14% a.a.)
  const debtRate =
    store.debts.reduce((max, d) => Math.max(max, d.annualRate || 0), 0) || 14;
  // Estimativa: economia de juros em 5 anos ao acelerar a amortização desse aporte.
  const interestSaved = values[1] * 12 * (debtRate / 100) * 5;
  // Economia de IR via PGBL calculada pela tabela progressiva de IRPF 2026.
  const annualGross = Math.max(0, global * 12);
  const pgblContribution = Math.min(values[0] * 12, annualGross * 0.12);
  const irSaved = Math.max(0, estimateAnnualIRPF2026(annualGross) - estimateAnnualIRPF2026(annualGross, pgblContribution));

  return (
    <Section
      title="Smart Allocation"
      subtitle="Distribua seu fluxo de caixa livre — o sistema traduz em impacto real."
    >
      <div className="max-w-2xl mx-auto rounded-3xl bg-zinc-900 border border-white/5 p-6 md:p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
        {/* Header */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            Fluxo de Caixa Livre Sugerido
          </p>
          <div className="mt-2 inline-flex items-baseline gap-2">
            <span className="text-zinc-500 text-2xl">R$</span>
            <input
              type="text"
              inputMode="numeric"
              value={new Intl.NumberFormat("pt-BR").format(free)}
              onChange={(e) => {
                const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                setFree(isNaN(n) ? 0 : n);
              }}
              className="bg-transparent outline-none border-none text-emerald-400 font-light tabular-nums tracking-tight text-5xl md:text-6xl text-center w-[7ch] focus:w-[9ch] transition-all"
            />
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            por mês · {global > 0 ? "renda global (PJ + CLT + RPA + Particular) − custos fixos" : suggestedFree > 0 ? "estimado a partir das suas receitas e custos fixos" : "informe seu excedente mensal"}
          </p>
        </div>

        {/* Buckets */}
        <div className="mt-10 grid grid-cols-3 gap-3 md:gap-4">
          <Bucket
            icon={pgblEligible ? <Landmark className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            label="PGBL / Fator R"
            pct={pct[0]}
            value={values[0]}
            onChange={(v) => setBucket(0, v)}
            sliderValue={w[0]}
            tone="emerald"
            disabled={!pgblEligible}
            disabledHint="Sua renda global está abaixo da faixa de IRPF — PGBL não traria abatimento."
          />
          <Bucket
            icon={<Wallet className="h-4 w-4" />}
            label="Amortização"
            pct={pct[1]}
            value={values[1]}
            onChange={(v) => setBucket(1, v)}
            sliderValue={w[1]}
            tone="amber"
          />
          <Bucket
            icon={<Home className="h-4 w-4" />}
            label="Projetos de Vida"
            pct={pct[2]}
            value={values[2]}
            onChange={(v) => setBucket(2, v)}
            sliderValue={w[2]}
            tone="sky"
          />
        </div>

        {/* Aviso de elegibilidade */}
        <p className="mt-6 text-[11px] text-zinc-500 leading-relaxed text-center">
          Otimização sugerida baseada na sua renda global (PJ + CLT + Outros).{" "}
          {pgblEligible ? (
            <>O aporte em PGBL é opcional para reduzir seu IRPF anual.</>
          ) : (
            <>Sua renda mensal global ({brl(global || 0)}) está abaixo da faixa de IRPF ({brl(IRPF_EXEMPTION_MONTHLY)}) — o bucket PGBL fica indisponível pois não há IR a abater.</>
          )}
        </p>

        {/* PGBL Insight Card */}
        <PGBLInsightCard />

        {/* Veredito de Máquina */}
        <div className="mt-8 space-y-2">
          {values[1] > 0 && (
            <Verdict>
              A alocação de <strong className="text-emerald-400 tabular-nums">{brl(values[1])}</strong>/mês
              economiza aproximadamente{" "}
              <strong className="text-emerald-400 tabular-nums">{brl(interestSaved)}</strong> em juros futuros (5 anos · {debtRate.toFixed(1)}% a.a.).
            </Verdict>
          )}
          {values[0] > 0 && pgblEligible && (
            <Verdict>
              Alocação otimizada para redução na base de cálculo do IRPF — economia anual estimada de{" "}
              <strong className="text-emerald-400 tabular-nums">{brl(irSaved)}</strong>.
            </Verdict>
          )}
          {values[2] > 0 && (
            <Verdict>
              <strong className="text-emerald-400 tabular-nums">{brl(values[2] * 12)}</strong>/ano direcionados
              para reserva e projetos de vida (imóvel, casamento, liberdade).
            </Verdict>
          )}
        </div>
      </div>
    </Section>
  );
}

function Bucket({
  icon, label, pct, value, sliderValue, onChange, tone, disabled, disabledHint,
}: {
  icon: React.ReactNode;
  label: string;
  pct: number;
  value: number;
  sliderValue: number;
  onChange: (v: number) => void;
  tone: "emerald" | "amber" | "sky";
  disabled?: boolean;
  disabledHint?: string;
}) {
  const accent =
    tone === "emerald" ? "rgb(16 185 129)" : tone === "amber" ? "rgb(245 158 11)" : "rgb(56 189 248)";
  const pctMax = 100;
  const trackPct = (sliderValue / pctMax) * 100;
  return (
    <div
      className={`rounded-2xl bg-zinc-950/60 border border-white/5 p-4 flex flex-col items-center text-center ${disabled ? "opacity-50" : ""}`}
      title={disabled ? disabledHint : undefined}
    >
      <div className="flex items-center gap-1.5 text-zinc-400">
        <span style={{ color: disabled ? "rgb(113 113 122)" : accent }}>{icon}</span>
        <span className="text-[10px] uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p
        className="font-display text-xl md:text-2xl font-light tabular-nums mt-2"
        style={{ color: disabled ? "rgb(113 113 122)" : accent }}
      >
        {brl(value)}
      </p>
      <p className="text-[11px] text-zinc-500 tabular-nums">{(pct * 100).toFixed(0)}%</p>
      <input
        type="range"
        min={0}
        max={pctMax}
        step={1}
        value={sliderValue}
        disabled={disabled}
        onChange={(e) => onChange(+e.target.value)}
        className={`mt-3 w-full h-1 appearance-none rounded-full ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
        style={{
          background: disabled
            ? "rgb(39 39 42)"
            : `linear-gradient(to right, ${accent} 0%, ${accent} ${trackPct}%, rgb(39 39 42) ${trackPct}%, rgb(39 39 42) 100%)`,
        }}
      />
      {disabled && disabledHint && (
        <p className="mt-2 text-[10px] text-zinc-500 leading-snug">{disabledHint}</p>
      )}
    </div>
  );
}

function Verdict({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2.5">
      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
      <p className="text-xs text-zinc-300 leading-relaxed">{children}</p>
    </div>
  );
}

// =================== FIRE — Simulador Patrimonial Interativo ===================
function FireSimulator() {
  const [age, setAge] = useState(35);
  const [target, setTarget] = useState(55);
  const [income, setIncome] = useState(30000);
  const [rate, setRate] = useState(8);

  const { targetWealth, monthly, years, chartData, totalContrib, totalInterest } = useMemo(() => {
    const yrs = Math.max(1, target - age);
    const months = yrs * 12;
    const annualReal = rate / 100;
    const monthlyReal = Math.pow(1 + annualReal, 1 / 12) - 1;
    const targetWealth = (income * 12) / Math.max(0.0001, annualReal);
    const monthly = monthlyReal === 0
      ? targetWealth / months
      : (targetWealth * monthlyReal) / (Math.pow(1 + monthlyReal, months) - 1);

    let balance = 0;
    const data: { ageLabel: number; invested: number; juros: number; total: number }[] = [
      { ageLabel: age, invested: 0, juros: 0, total: 0 },
    ];
    for (let y = 1; y <= yrs; y++) {
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + monthlyReal) + monthly;
      }
      const invested = monthly * 12 * y;
      data.push({
        ageLabel: age + y,
        invested: Math.round(invested),
        juros: Math.max(0, Math.round(balance - invested)),
        total: Math.round(balance),
      });
    }
    return {
      targetWealth, monthly, years: yrs, chartData: data,
      totalContrib: monthly * months,
      totalInterest: balance - monthly * months,
    };
  }, [age, target, income, rate]);

  return (
    <Section title="Independência Financeira" subtitle="Simulador patrimonial interativo — arraste e veja a bola de neve crescer">
      <TooltipProvider delayDuration={150}>
        <div className="rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-white/10 p-5 md:p-6 space-y-6">
          {/* HERO RESULT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Aporte mensal necessário
              </p>
              <p className="font-display text-5xl md:text-6xl font-light tabular-nums tracking-tight text-emerald-400 mt-1 drop-shadow-[0_0_30px_rgba(16,185,129,0.35)]">
                {brl(monthly)}
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                por <span className="text-emerald-400/80">{years} anos</span> · alvo {brl(targetWealth)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Total aportado" value={brl(totalContrib)} tone="neutral" />
              <MiniStat label="Juros compostos" value={brl(totalInterest)} tone="emerald" />
            </div>
          </div>

          <EffortConverter amount={monthly} period="mês" />

          {/* SLIDERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <SliderField
              label="Idade atual" suffix=" anos"
              value={age} min={18} max={70} step={1}
              onChange={(v) => { setAge(v); if (target <= v) setTarget(v + 1); }}
            />
            <SliderField
              label="Idade alvo" suffix=" anos"
              value={target} min={age + 1} max={85} step={1} onChange={setTarget}
            />
            <SliderField
              label="Renda mensal desejada" prefix="R$ " format
              value={income} min={3000} max={150000} step={500} onChange={setIncome}
            />
            <SliderField
              label="Taxa real" suffix="% a.a."
              tooltip="Taxa de retorno descontada da inflação. Ações brasileiras: ~6–9% reais; Tesouro IPCA+: ~5–7%."
              value={rate} min={2} max={15} step={0.5} onChange={setRate}
            />
          </div>

          {/* SNOWBALL CHART */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">O Efeito Bola de Neve</p>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1.5 text-zinc-400">
                  <span className="h-2 w-2 rounded-full bg-zinc-500" /> Aportes
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Juros compostos
                </span>
              </div>
            </div>
            <div className="h-64 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(113 113 122)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="rgb(113 113 122)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gJuros" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="ageLabel" tick={{ fill: "rgb(161 161 170)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgb(161 161 170)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => compact(v)} width={55} />
                  <RTooltip
                    contentStyle={{ background: "rgba(9,9,11,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "rgb(244 244 245)" }}
                    formatter={((v: any, name: any) => [brl(Number(v)), name === "invested" ? "Aportado" : "Juros"]) as any}
                    labelFormatter={(l) => `Aos ${l} anos`}
                  />
                  <Area type="monotone" dataKey="invested" stackId="1" stroke="rgb(113 113 122)" strokeWidth={1.5} fill="url(#gInvested)" />
                  <Area type="monotone" dataKey="juros" stackId="1" stroke="rgb(16 185 129)" strokeWidth={2} fill="url(#gJuros)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </Section>
  );
}

// =================== PGBL — Visualizador de Economia Tributária ===================
function TaxSimulator() {
  const [annual, setAnnual] = useState(360000);
  const [scenario, setScenario] = useState<"inercia" | "docfin">("docfin");
  const cap = annual * 0.12;
  const irSemPgbl = estimateAnnualIRPF2026(annual);
  const irComPgbl = estimateAnnualIRPF2026(annual, cap);
  const taxSaving = Math.max(0, irSemPgbl - irComPgbl);
  const pctSaved = irSemPgbl > 0 ? (taxSaving / irSemPgbl) * 100 : 0;

  // Projeção 20 anos: Inércia (paga IR cheio todo ano) vs Docfin (economia investida a 8% real)
  const chartData = useMemo(() => {
    const years = 20;
    const rate = 0.08;
    const data: { year: number; inercia: number; docfin: number }[] = [];
    let inerciaPaid = 0;
    let docfinWealth = 0;
    for (let y = 1; y <= years; y++) {
      inerciaPaid += irSemPgbl;
      docfinWealth = docfinWealth * (1 + rate) + taxSaving;
      data.push({
        year: y,
        inercia: Math.round(inerciaPaid),
        docfin: Math.round(docfinWealth),
      });
    }
    return data;
  }, [irSemPgbl, taxSaving]);

  const isDocfin = scenario === "docfin";

  return (
    <Section title="PGBL — O Visualizador de Economia Tributária" subtitle="Quanto você devolve ao Leão? Arraste e veja.">
      <TooltipProvider delayDuration={150}>
        <div className="rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-white/10 p-5 md:p-6 space-y-6">
          {/* HERO */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" /> Economia anual de IR
            </p>
            <p className="font-display text-5xl md:text-6xl font-light tabular-nums tracking-tight text-emerald-400 mt-1 drop-shadow-[0_0_30px_rgba(16,185,129,0.35)]">
              {brl(taxSaving)}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              aportando <span className="text-emerald-400/80">{brl(cap)}</span> em PGBL (12% da renda)
            </p>
          </div>

          {/* EFFORT CONVERTER */}
          <EffortConverter amount={taxSaving} period="ano" kind="saved" />

          {/* SLIDER */}
          <SliderField
            label="Renda bruta anual tributável" prefix="R$ " format
            tooltip="Soma de salário CLT, RPA e demais rendimentos tributáveis (não inclui PJ Simples Nacional)."
            value={annual} min={60000} max={2000000} step={5000} onChange={setAnnual}
          />

          {/* SCENARIO TOGGLE */}
          <div>
            <div className="inline-flex p-1 rounded-xl bg-zinc-900 border border-zinc-800 mb-3">
              <button
                type="button"
                onClick={() => setScenario("inercia")}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                  !isDocfin ? "bg-rose-500/15 text-rose-300 shadow-[0_0_20px_-8px_rgba(244,63,94,0.6)]" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Skull className="h-3.5 w-3.5" /> Cenário Inércia
              </button>
              <button
                type="button"
                onClick={() => setScenario("docfin")}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                  isDocfin ? "bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_-8px_rgba(16,185,129,0.7)]" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Crown className="h-3.5 w-3.5" /> Otimização Docfin
              </button>
            </div>

            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">
              {isDocfin
                ? "Patrimônio acumulado · economia investida a 8% real"
                : "Imposto pago acumulado · 20 anos de inércia"}
            </p>
            <div className="h-56 -ml-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gInercia" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(244 63 94)" stopOpacity={0.65} />
                      <stop offset="100%" stopColor="rgb(244 63 94)" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gDocfin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="year" tick={{ fill: "rgb(161 161 170)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}a`} />
                  <YAxis tick={{ fill: "rgb(161 161 170)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => compact(v)} width={55} />
                  <RTooltip
                    contentStyle={{ background: "rgba(9,9,11,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "rgb(244 244 245)" }}
                    formatter={((v: any) => [brl(Number(v)), isDocfin ? "Patrimônio" : "Imposto pago"]) as any}
                    labelFormatter={(l) => `Ano ${l}`}
                  />
                  <Area
                    type="monotone"
                    dataKey={isDocfin ? "docfin" : "inercia"}
                    stroke={isDocfin ? "rgb(16 185 129)" : "rgb(244 63 94)"}
                    strokeWidth={2}
                    fill={isDocfin ? "url(#gDocfin)" : "url(#gInercia)"}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* LION COMPARISON */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-3">
              Quanto vai para o IRPF · tabela progressiva 2026
            </p>
            <div className="space-y-3">
              <ScenarioBar
                icon={<Skull className="h-4 w-4" />}
                label="Sem PGBL"
                sub="Cenário padrão"
                value={irSemPgbl}
                pct={100}
                tone="rose"
              />
              <ScenarioBar
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Com PGBL otimizado"
                sub={`Diferimento: ${brl(taxSaving)} ficam investidos`}
                value={irComPgbl}
                pct={Math.max(8, (irComPgbl / irSemPgbl) * 100)}
                tone="emerald"
                highlight
              />
            </div>
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
              <Flame className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed">
                Você reduz o IR em <strong className="text-emerald-400 tabular-nums">{pctSaved.toFixed(1)}%</strong>.
                Isso são <strong className="tabular-nums">{brl(taxSaving)}</strong> que continuam rendendo na sua previdência —
                não na Receita.
              </p>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </Section>
  );
}

// =================== UI HELPERS ===================
function SliderField({
  label, value, min, max, step, onChange, prefix = "", suffix = "", format = false, tooltip,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (n: number) => void;
  prefix?: string; suffix?: string; format?: boolean; tooltip?: string;
}) {
  const display = format ? nf0.format(value) : value.toString().replace(".", ",");
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          {label}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-zinc-500 hover:text-zinc-300 transition">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] text-xs leading-relaxed">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </span>
      </div>
      <p className="text-3xl md:text-4xl font-bold tabular-nums text-emerald-400 mb-2 drop-shadow-[0_0_20px_rgba(16,185,129,0.25)]">
        {prefix}{display}{suffix}
      </p>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        style={{
          background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${pct}%, rgb(39 39 42) ${pct}%, rgb(39 39 42) 100%)`,
        }}
      />
    </div>
  );
}

function EffortConverter({
  amount, period, kind = "neutral",
}: { amount: number; period: "ano" | "mês"; kind?: "neutral" | "saved" }) {
  const PLANTAO = 1200;
  const CIRURGIA = 3500;
  const plantoes = Math.max(0, Math.round(amount / PLANTAO));
  const cirurgias = Math.max(0, Math.round(amount / CIRURGIA));
  const verb = kind === "saved" ? "poupados" : "a menos";
  if (amount <= 0) return null;
  return (
    <div className="rounded-xl bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5 mb-3">
        <Zap className="h-3 w-3 text-emerald-400" /> Conversor de Esforço Médico
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <Stethoscope className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            Equivale a <strong className="text-emerald-400 tabular-nums text-lg">{plantoes}</strong> plantões {verb} por {period}
          </p>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
          <Scissors className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed">
            Ou <strong className="text-cyan-400 tabular-nums text-lg">{cirurgias}</strong> cirurgias eletivas (TUSS) {kind === "saved" ? "poupadas" : "a menos"} no {period}
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "neutral" | "emerald" }) {
  const color = tone === "emerald" ? "text-emerald-400" : "text-zinc-200";
  return (
    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
      <p className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`font-display text-base mt-0.5 tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

function ScenarioBar({
  icon, label, sub, value, pct, tone, highlight,
}: {
  icon: React.ReactNode; label: string; sub: string;
  value: number; pct: number; tone: "rose" | "emerald"; highlight?: boolean;
}) {
  const color = tone === "emerald" ? "rgb(16 185 129)" : "rgb(244 63 94)";
  const glow = tone === "emerald" ? "rgba(16,185,129,0.35)" : "rgba(244,63,94,0.35)";
  return (
    <div
      className={`rounded-xl p-3 border ${highlight ? "border-emerald-500/40 bg-emerald-500/5" : "border-white/10 bg-white/[0.02]"}`}
      style={highlight ? { boxShadow: `0 0 30px -10px ${glow}` } : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-[10px] text-zinc-500">{sub}</p>
          </div>
        </div>
        <span className="font-display text-lg tabular-nums" style={{ color }}>{brl(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color, boxShadow: highlight ? `0 0 12px ${glow}` : undefined }} />
      </div>
    </div>
  );
}


function Stat({ icon, label, value, highlight }: { icon?: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl p-3 ${highlight ? "" : "bg-surface-elevated/40"}`}
      style={highlight ? { background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" } : undefined}
    >
      <p className={`text-[10px] uppercase tracking-wider flex items-center gap-1 ${highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
        {icon}{label}
      </p>
      <p className={`font-display text-lg mt-1 ${highlight ? "text-primary-foreground" : ""}`}>{value}</p>
    </div>
  );
}
