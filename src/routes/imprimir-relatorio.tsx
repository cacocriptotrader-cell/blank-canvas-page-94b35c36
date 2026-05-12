import { createFileRoute } from "@tanstack/react-router";
import { ExecutiveReport } from "@/components/ExecutiveReport";
import { Printer } from "lucide-react";

export const Route = createFileRoute("/imprimir-relatorio")({
  head: () => ({
    meta: [{ title: "Dossiê Executivo — Exportação" }],
  }),
  component: PrintReport,
});

function PrintReport() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <div className="no-print sticky top-0 z-50 flex items-center justify-between gap-3 px-6 py-4 bg-[#050505]/90 backdrop-blur border-b border-zinc-900">
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
          Pré-visualização do Dossiê
        </p>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold bg-emerald-500 text-black hover:bg-emerald-400 transition"
        >
          <Printer className="h-3.5 w-3.5" />
          Exportar Dossiê
        </button>
      </div>
      <ExecutiveReport />
    </div>
  );
}
