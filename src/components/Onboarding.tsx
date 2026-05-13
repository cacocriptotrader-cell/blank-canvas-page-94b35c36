import { useState } from "react";
import { useStore, type CareerMoment } from "@/lib/store";
import { ArrowRight, Command, User, MapPin, Briefcase } from "lucide-react";

export function Onboarding() {
  const { completeOnboarding, updateUserProfile } = useStore();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [careerMoment, setCareerMoment] = useState<CareerMoment>("Médico Especialista");

  function handleNext() {
    if (step === 1) {
      setStep(2);
    } else {
      updateUserProfile({ fullName, city, careerMoment });
      completeOnboarding();
    }
  }

  const isStep2Valid = fullName.trim() !== "" && city.trim() !== "";

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

        {step === 1 ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-semibold tracking-tight leading-tight">
              Wealth management<br />para médicos.
            </h1>
            <p className="text-base text-zinc-400 mt-6 leading-relaxed">
              Fluxo de caixa, custo real por plantão, ledger de cirurgias e
              projeções de independência financeira — em um terminal único.
            </p>

            <button
              onClick={handleNext}
              className="mt-10 inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 transition-all duration-200"
            >
              Começar <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2 mb-8">
              <h2 className="text-2xl font-semibold tracking-tight">Conhecer o seu perfil</h2>
              <p className="text-sm text-zinc-500">Personalize a sua experiência no Docfin.</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium flex items-center gap-2">
                  <User className="h-3 w-3" /> Nome Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Como gostaria de ser chamado?"
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Cidade de Atuação
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: São Paulo, SP"
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium flex items-center gap-2">
                  <Briefcase className="h-3 w-3" /> Momento de Carreira
                </label>
                <select
                  value={careerMoment}
                  onChange={(e) => setCareerMoment(e.target.value as CareerMoment)}
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl h-12 px-4 text-sm focus:outline-none focus:border-white/20 transition-colors appearance-none"
                >
                  <option value="Estudante/Cursinho">Estudante/Cursinho</option>
                  <option value="Residente">Residente</option>
                  <option value="Médico Especialista">Médico Especialista</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={!isStep2Valid}
              className="w-full mt-10 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-200 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
            >
              Finalizar Perfil <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        )}

        <p className="text-[11px] text-zinc-600 mt-12 font-mono">
          v1.0 · criptografia local de ponta a ponta
        </p>
      </div>
    </div>
  );
}
