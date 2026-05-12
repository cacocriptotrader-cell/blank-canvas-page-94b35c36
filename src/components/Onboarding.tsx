import { useStore } from "@/lib/store";
import { ArrowRight, Command } from "lucide-react";

export function Onboarding() {
  const { completeOnboarding } = useStore();
  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-7 w-7 rounded-md bg-foreground text-background flex items-center justify-center">
            <Command className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Docfin</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-l border-border pl-2 ml-1">
            Wealth
          </span>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight leading-tight">
          Wealth management<br />para médicos.
        </h1>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-sm">
          Fluxo de caixa, custo real por plantão, ledger de cirurgias e
          projeções de independência financeira — em um terminal único.
        </p>

        <button
          onClick={completeOnboarding}
          className="mt-8 inline-flex items-center gap-2 h-10 px-4 rounded-md bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-all duration-200"
        >
          Começar <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <p className="text-[11px] text-muted-foreground mt-8 font-mono">
          v1.0 · dados armazenados localmente
        </p>
      </div>
    </div>
  );
}
