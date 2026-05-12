import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useStore, computeShift, brl2, TAX_LABELS, computeTaxForRegime,
  checkTaxOptimization, getCurrentMonthPJTotal, computedProLaboreMonthly,
  calculateExpectedPaymentDate, didSkipCycle, fmtDate,
  type Shift, type TeamMember, type SurgeryRecord, type InvoiceMode,
  type TaxRegime,
} from "@/lib/store";
import { Section } from "@/components/Section";
import {
  MapPin, Navigation, Save, Info, Stethoscope, Scissors, Plus, Trash2,
  AlertTriangle, ShieldCheck, Users, Crown, UserCheck, ShieldAlert,
  CalendarClock, Zap,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/novo-registro")({
  head: () => ({
    meta: [
      { title: "Novo Registro — Docfin" },
      { name: "description", content: "Registre plantões padrão ou cirurgias com ledger de repasses da equipe." },
    ],
  }),
  component: NovoRegistro,
});

type Tab = "shift" | "surgery";

function NovoRegistro() {
  const [tab, setTab] = useState<Tab>("shift");
  return (
    <>
      <Section title="Novo registro" subtitle="Plantão padrão ou cirurgia/procedimento com equipe">
        <div className="glass-card rounded-2xl p-1.5 grid grid-cols-2 gap-1">
          <TabBtn active={tab === "shift"} onClick={() => setTab("shift")} icon={<Stethoscope className="h-4 w-4" />} label="Plantão Padrão" />
          <TabBtn active={tab === "surgery"} onClick={() => setTab("surgery")} icon={<Scissors className="h-4 w-4" />} label="Cirurgia/Procedimento" />
        </div>
      </Section>
      {tab === "shift" ? <ShiftForm /> : <SurgeryForm />}
    </>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl py-3 text-sm font-medium inline-flex items-center justify-center gap-2 transition ${
        active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
      style={active ? { background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" } : undefined}
    >
      {icon} {label}
    </button>
  );
}

/* ============ SHIFT FORM (mesma lógica original, preservada) ============ */
function ShiftForm() {
  const store = useStore();
  const nav = useNavigate();
  const [workplaceId, setWorkplaceId] = useState(store.workplaces[0]?.id ?? "");
  const [originId, setOriginId] = useState("home");
  const [hours, setHours] = useState(12);
  const [gross, setGross] = useState(0);
  const [extraCost, setExtraCost] = useState(40);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const wp = store.workplaces.find((w) => w.id === workplaceId);
  const suggestedGross = gross || (wp?.hourlyRate ?? 0) * hours;

  // Regime override (Smart Tax Router): default = regime do workplace
  const [regimeOverride, setRegimeOverride] = useState<TaxRegime | null>(null);
  const effectiveRegime: TaxRegime = regimeOverride ?? (wp?.regime ?? "PJ_SIMPLES");
  // reset override when workplace changes
  useMemo(() => { setRegimeOverride(null); }, [workplaceId]);

  const preview = useMemo<Shift>(() => ({
    id: "preview", date, workplaceId, originId, hours, gross: suggestedGross, extraCost,
  }), [date, workplaceId, originId, hours, suggestedGross, extraCost]);
  const baseMath = wp ? computeShift(store, preview) : { km: 0, fuelCost: 0, wearCost: 0, tax: 0, net: 0, logistics: 0 };
  // recompute tax/net usando o regime efetivo (override)
  const math = useMemo(() => {
    const tax = computeTaxForRegime(suggestedGross, effectiveRegime, store);
    return { ...baseMath, tax, net: suggestedGross - tax - baseMath.logistics };
  }, [baseMath, suggestedGross, effectiveRegime, store]);

  // Smart Tax Router — somente avalia se o regime efetivo é PJ
  const today = new Date(date + "T12:00:00");
  const monthPJTotal = useMemo(
    () => getCurrentMonthPJTotal(store as any, today.getFullYear(), today.getMonth() + 1),
    [store, date],
  );
  const proLaboreTotal = computedProLaboreMonthly(store, today);
  const isPJ = effectiveRegime === "PJ_SIMPLES" || effectiveRegime === "PJ_LUCRO_PRESUMIDO";
  const taxAlert = isPJ
    ? checkTaxOptimization(suggestedGross, monthPJTotal, proLaboreTotal)
    : { triggered: false, projectedPJTotal: 0, requiredProLabore: 0, proLaboreShortfall: 0 };

  function save() {
    if (!wp) return;
    store.addShift({ date, workplaceId, originId, hours, gross: suggestedGross, extraCost });
    nav({ to: "/" });
  }

  return (
    <>
      <Section title="Dados do plantão" subtitle="Cálculo dinâmico de rota, imposto e líquido">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <Field label="Data">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Origem" icon={<MapPin className="h-3.5 w-3.5" />}>
            <select value={originId} onChange={(e) => setOriginId(e.target.value)} className={inputCls}>
              <option value="home">{store.base.label}</option>
              {store.workplaces.filter((w) => w.id !== workplaceId).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Destino (Hospital)" icon={<Navigation className="h-3.5 w-3.5" />}>
            <select value={workplaceId} onChange={(e) => setWorkplaceId(e.target.value)} className={inputCls}>
              {store.workplaces.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Valor total do plantão (R$)">
            <input type="number" min={0} value={suggestedGross || ""} onChange={(e) => setGross(+e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            {[6, 12, 24].map((h) => (
              <button key={h} type="button" onClick={() => setHours(h)} className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${hours === h ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface-elevated/40 text-muted-foreground hover:text-foreground"}`}>
                {h}h
              </button>
            ))}
          </div>
          <Field label="Gastos extras (R$)">
            <input type="number" min={0} value={extraCost} onChange={(e) => setExtraCost(+e.target.value)} className={inputCls} />
          </Field>
          <Field label="Regime / Origem">
            <select value={effectiveRegime} onChange={(e) => setRegimeOverride(e.target.value as TaxRegime)} className={inputCls}>
              {Object.entries(TAX_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Resumo do dia" subtitle={wp ? TAX_LABELS[wp.regime] : ""}>
        <div className="glass-card rounded-2xl p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Metric label="Distância" value={`${math.km.toFixed(1)} km`} />
            <Metric label="Gasolina" value={brl2(math.fuelCost)} accent="warning" />
            <Metric label="Desgaste" value={brl2(math.wearCost)} accent="warning" />
            <Metric label="Imposto" value={brl2(math.tax)} accent="warning" />
            <div className="col-span-2 bg-surface-elevated/40 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Logística total</p>
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-primary"><Info className="h-3 w-3" /></button>
                </TooltipTrigger><TooltipContent side="top" className="max-w-[220px] text-[11px] leading-snug">
                  Combustível + depreciação + manutenção + extras.
                </TooltipContent></Tooltip></TooltipProvider>
              </div>
              <p className="font-mono text-sm text-warning">{brl2(math.logistics)}</p>
            </div>
          </div>
          {taxAlert.triggered && (
            <TaxRouterInsight
              projectedTotal={taxAlert.projectedPJTotal}
              onSwitchToPF={() => setRegimeOverride("PF")}
            />
          )}
          {wp && (() => {
            const payDate = calculateExpectedPaymentDate(date, wp);
            const skipped = didSkipCycle(date, wp);
            const instant = wp.paymentRule === "INSTANT_D0";
            return (
              <div className={`mt-3 rounded-xl border p-3 flex gap-2 ${
                instant ? "border-success/40 bg-success/10"
                : skipped ? "border-warning/40 bg-warning/10"
                : "border-primary/30 bg-primary/5"
              }`}>
                {instant ? <Zap className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  : skipped ? <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  : <CalendarClock className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                <div className="text-[11px] leading-snug">
                  <p className={`font-medium ${instant ? "text-success" : skipped ? "text-warning" : "text-primary"}`}>
                    {instant ? "Recebimento imediato (D+0)"
                      : skipped ? "Pulo de ciclo detectado"
                      : "Recebimento previsto"}
                  </p>
                  <p className="text-muted-foreground">
                    {instant
                      ? <>Particular/Pix — entra em <strong>{fmtDate(payDate)}</strong>.</>
                      : <>Cai em <strong>{fmtDate(payDate)}</strong> — envio da nota no dia {wp.cutOffDay} do mês seguinte + {wp.paymentTermDays} dias de prazo.</>}
                  </p>
                </div>
              </div>
            );
          })()}
          <div className="border-t border-border pt-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Lucro líquido</p>
              <p className={`font-display text-3xl mt-0.5 ${math.net >= 0 ? "text-gradient" : "text-destructive"}`}>{brl2(math.net)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Bruto: {brl2(suggestedGross)}</p>
            </div>
            <button onClick={save} disabled={!wp}
              className="rounded-xl px-5 py-3 text-sm font-medium text-primary-foreground inline-flex items-center gap-2 disabled:opacity-50"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
              <Save className="h-4 w-4" /> Salvar
            </button>
          </div>
        </div>
      </Section>
    </>
  );
}

/* ============ SURGERY FORM (Ledger ramificado) ============ */
function SurgeryForm() {
  const store = useStore();
  const nav = useNavigate();
  const [myRole, setMyRole] = useState<"TITULAR" | "MEMBRO_EQUIPE">("TITULAR");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [procedure, setProcedure] = useState("");
  const [notes, setNotes] = useState("");

  // TITULAR
  const [hospitalId, setHospitalId] = useState(store.workplaces[0]?.id ?? "");
  const [totalGross, setTotalGross] = useState(0);
  const [invoiceMode, setInvoiceMode] = useState<InvoiceMode>("FRACTIONED");
  const [team, setTeam] = useState<TeamMember[]>([]);

  // MEMBRO_EQUIPE
  const [payingSurgeonName, setPayingSurgeonName] = useState("");
  const [myExpectedShare, setMyExpectedShare] = useState(0);

  const hospital = store.workplaces.find((w) => w.id === hospitalId);
  // Regime override (Smart Tax Router)
  const [regimeOverride, setRegimeOverride] = useState<TaxRegime | null>(null);
  const effectiveRegime: TaxRegime = regimeOverride ?? (hospital?.regime ?? "PJ_SIMPLES");
  useMemo(() => { setRegimeOverride(null); }, [hospitalId]);
  const taxRate = taxBase > 0 ? computeTaxForRegime(taxBase, effectiveRegime, store) / taxBase : 0;
  const teamTotal = team.reduce((a, m) => a + (m.amountDue || 0), 0);
  const myShareTitular = Math.max(0, totalGross - teamTotal);
  const taxBase = invoiceMode === "SINGLE" ? totalGross : myShareTitular;
  const taxEstimated = computeTaxForRegime(taxBase, effectiveRegime, store);
  const myNet = myShareTitular - taxEstimated;

  // Smart Tax Router — newAmount = parte tributável do titular
  const sgDate = new Date(date + "T12:00:00");
  const monthPJTotal = useMemo(
    () => getCurrentMonthPJTotal(store as any, sgDate.getFullYear(), sgDate.getMonth() + 1),
    [store, date],
  );
  const proLaboreTotal = computedProLaboreMonthly(store, sgDate);
  const isPJ = effectiveRegime === "PJ_SIMPLES" || effectiveRegime === "PJ_LUCRO_PRESUMIDO";
  const taxAlert = isPJ
    ? checkTaxOptimization(taxBase, monthPJTotal, proLaboreTotal)
    : { triggered: false, projectedPJTotal: 0, requiredProLabore: 0, proLaboreShortfall: 0 };

  function addMember() {
    setTeam((t) => [...t, { id: Math.random().toString(36).slice(2, 8), name: "", role: "Auxiliar", amountDue: 0, isPaid: false }]);
  }
  function updateMember(id: string, patch: Partial<TeamMember>) {
    setTeam((t) => t.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function removeMember(id: string) {
    setTeam((t) => t.filter((m) => m.id !== id));
  }

  function save() {
    if (myRole === "TITULAR") {
      if (!hospital) return;
      store.addSurgery({
        myRole: "TITULAR", date, procedure, notes,
        hospitalId, totalGross, invoiceMode, teamSplit: team,
        receivedFromHospital: false,
      } as Omit<SurgeryRecord, "id">);
    } else {
      store.addSurgery({
        myRole: "MEMBRO_EQUIPE", date, procedure, notes,
        payingSurgeonName, myExpectedShare, isReceived: false,
      } as Omit<SurgeryRecord, "id">);
    }
    nav({ to: "/caixa" });
  }

  return (
    <>
      <Section title="Meu papel na cirurgia" subtitle="A ramificação muda o ledger e o risco fiscal">
        <div className="glass-card rounded-2xl p-1.5 grid grid-cols-2 gap-1">
          <RoleBtn active={myRole === "TITULAR"} onClick={() => setMyRole("TITULAR")} icon={<Crown className="h-4 w-4" />} label="Sou Titular" sub="Recebo do hospital e repasso" />
          <RoleBtn active={myRole === "MEMBRO_EQUIPE"} onClick={() => setMyRole("MEMBRO_EQUIPE")} icon={<UserCheck className="h-4 w-4" />} label="Sou Membro" sub="Recebo de outro cirurgião" />
        </div>
      </Section>

      <Section title="Dados básicos">
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <Field label="Data">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Procedimento (TUSS / descrição)">
            <input type="text" value={procedure} onChange={(e) => setProcedure(e.target.value)} placeholder="ex: 31602126 — Colecistectomia VL" className={inputCls} />
          </Field>
        </div>
      </Section>

      {myRole === "TITULAR" ? (
        <>
          <Section title="Faturamento (Titular)" subtitle="Hospital pagador & valor cheio recebido">
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <Field label="Hospital pagador" icon={<Navigation className="h-3.5 w-3.5" />}>
                <select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} className={inputCls}>
                  {store.workplaces.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} · {TAX_LABELS[w.regime]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Valor TOTAL faturado (R$)">
                <input type="number" min={0} value={totalGross} onChange={(e) => setTotalGross(+e.target.value)} className={inputCls} />
              </Field>
              <Field label="Regime / Origem">
                <select value={effectiveRegime} onChange={(e) => setRegimeOverride(e.target.value as TaxRegime)} className={inputCls}>
                  <option value="PJ_SIMPLES">PJ (Simples Nacional)</option>
                  <option value="CLT">CLT</option>
                  <option value="RPA">RPA / Autônomo</option>
                  <option value="PARTICULAR_PIX">Particular (Pix)</option>
                  <option value="SCP">Sociedade (SCP)</option>
                </select>
              </Field>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Como a NF foi emitida?</p>
                <div className="grid grid-cols-2 gap-2">
                  <InvoiceBtn active={invoiceMode === "SINGLE"} onClick={() => setInvoiceMode("SINGLE")} label="Nota Única" sub="Faturei o total" />
                  <InvoiceBtn active={invoiceMode === "FRACTIONED"} onClick={() => setInvoiceMode("FRACTIONED")} label="Notas Fracionadas" sub="Cada um emitiu a sua" />
                </div>
                {invoiceMode === "SINGLE" && totalGross > 0 && (
                  <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-snug">
                      <p className="text-destructive font-medium">Risco de Bitributação</p>
                      <p className="text-muted-foreground">O imposto incidirá sobre o dinheiro da equipe. Imposto estimado: <span className="text-destructive font-mono">{brl2(totalGross * taxRate)}</span> sobre o valor cheio.</p>
                    </div>
                  </div>
                )}
                {invoiceMode === "FRACTIONED" && (
                  <div className="mt-3 rounded-xl border border-success/40 bg-success/10 p-3 flex gap-2">
                    <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <div className="text-[11px] leading-snug">
                      <p className="text-success font-medium">Tributação otimizada</p>
                      <p className="text-muted-foreground">Imposto incide apenas sobre sua parte líquida ({brl2(myShareTitular)}).</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>

          <Section title="Equipe & repasses" subtitle="Quanto cada membro receberá quando o hospital pagar"
            action={
              <button onClick={addMember} className="text-xs inline-flex items-center gap-1 text-primary hover:underline">
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            }>
            <div className="glass-card rounded-2xl p-3 space-y-2">
              {team.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum membro. Adicione auxiliares, anestesista, instrumentador.</p>
              )}
              {team.map((m) => (
                <div key={m.id} className="bg-surface-elevated/40 rounded-lg p-3 grid grid-cols-12 gap-2 items-center">
                  <input className={inputCls + " col-span-5"} placeholder="Nome" value={m.name} onChange={(e) => updateMember(m.id, { name: e.target.value })} />
                  <input className={inputCls + " col-span-3"} placeholder="Função" value={m.role} onChange={(e) => updateMember(m.id, { role: e.target.value })} />
                  <input type="number" className={inputCls + " col-span-3"} placeholder="R$" value={m.amountDue} onChange={(e) => updateMember(m.id, { amountDue: +e.target.value })} />
                  <button onClick={() => removeMember(m.id)} className="col-span-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 px-2 text-xs">
                <span className="text-muted-foreground inline-flex items-center gap-1"><Users className="h-3 w-3" /> Total de repasses</span>
                <span className="font-mono text-warning">{brl2(teamTotal)}</span>
              </div>
            </div>
          </Section>

          <Section title="Resumo (Titular)">
            <div className="glass-card rounded-2xl p-5">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Metric label="Valor cheio" value={brl2(totalGross)} />
                <Metric label="Repasses equipe" value={brl2(teamTotal)} accent="warning" />
                <Metric label={`Imposto (${(taxRate * 100).toFixed(2)}%)`} value={brl2(taxEstimated)} accent="warning" />
                <Metric label="Base tributável" value={brl2(taxBase)} />
              </div>
              {taxAlert.triggered && (
                <TaxRouterInsight
                  projectedTotal={taxAlert.projectedPJTotal}
                  onSwitchToPF={() => setRegimeOverride("PF")}
                />
              )}
              <div className="border-t border-border pt-4 flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Meu líquido</p>
                  <p className={`font-display text-3xl mt-0.5 ${myNet >= 0 ? "text-gradient" : "text-destructive"}`}>{brl2(myNet)}</p>
                </div>
                <button onClick={save} disabled={!hospital || totalGross <= 0}
                  className="rounded-xl px-5 py-3 text-sm font-medium text-primary-foreground inline-flex items-center gap-2 disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
                  <Save className="h-4 w-4" /> Salvar cirurgia
                </button>
              </div>
            </div>
          </Section>
        </>
      ) : (
        <Section title="Recebimento de colega (Membro de Equipe)">
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <Field label="Cirurgião que vai te pagar">
              <input type="text" value={payingSurgeonName} onChange={(e) => setPayingSurgeonName(e.target.value)} placeholder="Dr. Fulano" className={inputCls} />
            </Field>
            <Field label="Valor a receber (R$)">
              <input type="number" min={0} value={myExpectedShare} onChange={(e) => setMyExpectedShare(+e.target.value)} className={inputCls} />
            </Field>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-[11px] text-muted-foreground leading-snug">
              Esta cirurgia entrará no painel <span className="text-primary font-medium">"A Receber de Colegas"</span> em Caixa.
            </div>
            <button onClick={save} disabled={!payingSurgeonName || myExpectedShare <= 0}
              className="w-full rounded-xl py-3 text-sm font-medium text-primary-foreground inline-flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}>
              <Save className="h-4 w-4" /> Salvar
            </button>
          </div>
        </Section>
      )}
    </>
  );
}

/* ============ helpers UI ============ */
const inputCls = "w-full bg-input/60 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}
function Metric({ label, value, accent }: { label: string; value: string; accent?: "warning" }) {
  return (
    <div className="bg-surface-elevated/40 rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono text-sm mt-1 ${accent === "warning" ? "text-warning" : ""}`}>{value}</p>
    </div>
  );
}
function RoleBtn({ active, onClick, icon, label, sub }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <button onClick={onClick}
      className={`rounded-xl p-3 text-left transition ${active ? "text-primary-foreground" : "text-foreground bg-surface-elevated/40 hover:bg-surface-elevated/70"}`}
      style={active ? { background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" } : undefined}>
      <div className="inline-flex items-center gap-1.5 text-sm font-medium">{icon} {label}</div>
      <p className={`text-[10px] mt-0.5 ${active ? "opacity-90" : "text-muted-foreground"}`}>{sub}</p>
    </button>
  );
}
function InvoiceBtn({ active, onClick, label, sub }: { active: boolean; onClick: () => void; label: string; sub: string }) {
  return (
    <button onClick={onClick}
      className={`rounded-xl p-3 text-left border transition ${active ? "border-primary bg-primary/10" : "border-border bg-surface-elevated/40 hover:bg-surface-elevated/70"}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
    </button>
  );
}

/* ============ Smart Tax Router — Insight Card ============ */
function TaxRouterInsight({
  projectedTotal,
  onSwitchToPF,
}: {
  projectedTotal: number;
  onSwitchToPF: () => void;
}) {
  return (
    <div
      className="my-4 rounded-xl border border-amber-500/30 bg-amber-900/20 p-3.5 flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
      role="status"
      aria-live="polite"
    >
      <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <p className="text-[12px] leading-snug text-amber-100">
          <span className="font-medium">Otimização Fiscal:</span> Este valor fará sua PJ
          {" "}<span className="text-amber-300 font-medium">perder o Fator R</span>
          {" "}(faturamento PJ projetado: <span className="font-mono">{brl2(projectedTotal)}</span>).
          O imposto sobe de <span className="font-mono">6%</span> para <span className="font-mono">15,5%</span>.
          Considere faturar este procedimento via Pessoa Física (RPA/Carnê Leão) ou ajustar seu Pro-labore.
        </p>
        <button
          type="button"
          onClick={onSwitchToPF}
          className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-200 transition"
        >
          Mudar para Pessoa Física
        </button>
      </div>
    </div>
  );
}
