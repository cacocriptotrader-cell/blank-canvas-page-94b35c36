import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Command, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
      } else {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (authError) throw authError;
        alert("Verifique seu e-mail para confirmar o cadastro.");
      }

      // Check profile and redirect
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        if (profile?.onboarding_completed) {
          navigate({ to: "/" });
        } else {
          navigate({ to: "/gestao" }); // Using /gestao as the onboarding target based on previous context
        }
      }
    } catch (err: any) {
      setError(err.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-zinc-950 text-white">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-12">
          <div className="h-7 w-7 rounded-md bg-white text-black flex items-center justify-center">
            <Command className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold tracking-tight">Docfin</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 border-l border-white/10 pl-2 ml-1">
            Wealth
          </span>
        </div>

        <div className="space-y-2 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            {mode === "login" ? "Bem-vindo de volta" : "Criar sua conta"}
          </h1>
          <p className="text-sm text-zinc-500">
            {mode === "login" 
              ? "Acesse seu terminal de wealth management." 
              : "Comece sua jornada de liberdade financeira."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium flex items-center gap-2">
              <Mail className="h-3 w-3" /> E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-zinc-900 border border-white/5 rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium flex items-center gap-2">
              <Lock className="h-3 w-3" /> Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-900 border border-white/5 rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg p-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === "login" ? "Entrar" : "Cadastrar"}
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            {mode === "login" 
              ? "Não tem uma conta? Cadastre-se" 
              : "Já tem uma conta? Faça login"}
          </button>
        </div>

        <p className="text-[11px] text-zinc-600 mt-12 font-mono text-center">
          v1.0 · infraestrutura segura via Supabase
        </p>
      </div>
    </div>
  );
}
