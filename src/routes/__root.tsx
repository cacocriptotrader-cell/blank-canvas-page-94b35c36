import { Outlet, createRootRoute, HeadContent, Scripts, Link, useLocation } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { StoreProvider, useStore } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { Onboarding } from "@/components/Onboarding";
import { FiscalOnboardingModal } from "@/components/FiscalOnboardingModal";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass-card rounded-2xl p-10">
        <h1 className="text-7xl font-display text-gradient">404</h1>
        <h2 className="mt-3 text-xl">Página não encontrada</h2>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-xl px-4 py-2 text-sm font-medium text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Docfin — Wealth Management para Médicos" },
      { name: "description", content: "Gestão financeira premium para plantonistas: fluxo de caixa, Fator R, alocação inteligente e independência financeira." },
      { name: "theme-color", content: "#0f1726" },
      { property: "og:title", content: "Docfin — Wealth Management para Médicos" },
      { property: "og:description", content: "Gestão financeira premium para plantonistas: fluxo de caixa, Fator R, alocação inteligente e independência financeira." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Docfin — Wealth Management para Médicos" },
      { name: "twitter:description", content: "Gestão financeira premium para plantonistas: fluxo de caixa, Fator R, alocação inteligente e independência financeira." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d136b74e-3784-4992-878c-7a8fd1ba7fcb/id-preview-a70e4558--fb88fa8a-740b-475b-b7ba-dcf93b4c3e9f.lovable.app-1777585050815.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/d136b74e-3784-4992-878c-7a8fd1ba7fcb/id-preview-a70e4558--fb88fa8a-740b-475b-b7ba-dcf93b4c3e9f.lovable.app-1777585050815.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <StoreProvider>
      <OnboardingGate />
    </StoreProvider>
  );
}

function OnboardingGate() {
  const { hasCompletedOnboarding, taxProfile } = useStore();
  const { pathname } = useLocation();
  // Rota dedicada de impressão: bypass total (sem onboarding, sem shell).
  if (pathname === "/imprimir-relatorio") return <AppShell />;
  if (!hasCompletedOnboarding) return <Onboarding />;
  return (
    <>
      <AppShell />
      {!taxProfile.completed && <FiscalOnboardingModal />}
    </>
  );
}
