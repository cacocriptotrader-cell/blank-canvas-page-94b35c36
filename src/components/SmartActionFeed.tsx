import { useMemo } from "react";
import { useStore, computedProLaboreMonthly, daysUntil, brl, DOCUMENT_KIND_LABELS, fmtDate, getCurrentMonthRegimeTotal, checkTaxOptimization } from "@/lib/store";
import { MessageCircle, Scale, ShieldCheck, AlertTriangle } from "lucide-react";

type Urgency = "warning" | "danger";

interface ActionItem {
  id: string;
  urgency: Urgency;
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  cta: { label: string; onClick: () => void; tone: "emerald" | "amber" | "white" };
}

export function SmartActionFeed() {
  const store = useStore();

  const actions = useMemo<ActionItem[]>(() => {
    const out: ActionItem[] = [];

    // ====== Tipo A · Cobranças (cirurgias onde sou MEMBRO e ainda não recebi) ======
    store.surgeries.forEach((s) => {
      if (s.myRole !== "MEMBRO_EQUIPE" || s.isReceived) return;
      const dia = fmtDate(new Date(s.date + "T12:00:00"));
      const valor = brl(s.myExpectedShare);
      const text = `Olá Dr(a). ${s.payingSurgeonName}, tudo bem? Passando para confirmar o repasse de ${valor} referente à ${s.procedure || "cirurgia"} do dia ${dia}. Obrigado!`;
      const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
      out.push({
        id: `cob-${s.id}`,
        urgency: "warning",
        icon: <MessageCircle className="h-4 w-4" />,
        title: `${s.payingSurgeonName} ainda não repassou ${valor}`,
        body: <>Referente à {s.procedure || "cirurgia"} de <span className="text-white">{dia}</span>.</>,
        cta: {
          label: "Cobrar via WhatsApp",
          tone: "emerald",
          onClick: () => {
            if (typeof window !== "undefined") window.open(wa, "_blank");
          },
        },
      });
    });

    // ====== Tipo B · Alerta Fiscal (Fator R baixo) ======
    const now = new Date();
    const pjRevenueMonth = getCurrentMonthRegimeTotal(store, now.getFullYear(), now.getMonth() + 1, ["PJ_SIMPLES"]);
    const proLaboreMonthly = computedProLaboreMonthly(store);
    const factorR = pjRevenueMonth > 0 ? (proLaboreMonthly / pjRevenueMonth) * 100 : 0;
    const optimization = checkTaxOptimization(pjRevenueMonth, 0, proLaboreMonthly);

    if (pjRevenueMonth > 0 && optimization.triggered) {
      const delta = optimization.proLaboreShortfall;
      out.push({
        id: "fator-r",
        urgency: "warning",
        icon: <Scale className="h-4 w-4" />,
        title: `Pró-labore precisa subir ${brl(delta)} para manter o Fator R`,
        body: <>Faturamento PJ Simples · Fator R em <span className="text-white tabular-nums">{factorR.toFixed(1)}%</span> (alvo 28%).</>,
        cta: {
          label: "Ajustar",
          tone: "amber",
          onClick: () => {
            if (typeof window !== "undefined") window.location.assign("/gestao");
          },
        },
      });
    }

    // ====== Tipo C · Compliance (documentos vencendo em ≤30 dias) ======
    store.documents.forEach((d) => {
      const k = daysUntil(d.expiresAt);
      if (k > 30) return;
      const urgency: Urgency = k <= 7 ? "danger" : "warning";
      out.push({
        id: `doc-${d.id}`,
        urgency,
        icon: <ShieldCheck className="h-4 w-4" />,
        title: `Seu ${DOCUMENT_KIND_LABELS[d.kind]} vence em ${Math.max(0, k)} dia${k === 1 ? "" : "s"}`,
        body: <>{d.label} · expira em <span className="text-white">{fmtDate(new Date(d.expiresAt + "T12:00:00"))}</span>.</>,
        cta: {
          label: "Renovado",
          tone: "white",
          onClick: () => {
            // dá baixa: empurra a expiração 1 ano à frente
            const next = new Date(d.expiresAt + "T12:00:00");
            next.setFullYear(next.getFullYear() + 1);
            const iso = next.toISOString().slice(0, 10);
            store.removeDocument(d.id);
            store.addDocument({
              kind: d.kind,
              label: d.label,
              expiresAt: iso,
              renewalCost: d.renewalCost,
            });
          },
        },
      });
    });

    return out;
  }, [store]);

  if (actions.length === 0) return null;

  return (
    <section className="mt-2 mb-6 animate-fade-in">
      <div className="flex items-center gap-2 px-1 mb-3">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
          Ações Requeridas
        </h2>
        <span className="text-[10px] tabular-nums text-muted-foreground/70">
          · {actions.length} pendência{actions.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-2">
        {actions.map((a) => {
          const edgeColor =
            a.urgency === "danger" ? "before:bg-rose-500" : "before:bg-amber-400";
          const ctaClass =
            a.cta.tone === "emerald"
              ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
              : a.cta.tone === "amber"
              ? "bg-amber-400 hover:bg-amber-300 text-zinc-950"
              : "bg-white hover:bg-zinc-100 text-zinc-950";

          return (
            <div
              key={a.id}
              className={`group relative rounded-xl bg-[#18181B] border border-white/5 pl-4 pr-3 py-3 flex items-start gap-3 transition-all hover:border-white/15
                          before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full ${edgeColor}
                          before:shadow-[0_0_10px_currentColor]`}
            >
              <div className="mt-0.5 text-white/60 shrink-0">{a.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/95 leading-snug">{a.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {a.body}
                </p>
              </div>
              <button
                onClick={a.cta.onClick}
                className={`shrink-0 self-center text-[11px] font-medium px-3 py-1.5 rounded-md transition-all ${ctaClass} tabular-nums`}
              >
                {a.cta.label}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
