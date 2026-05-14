## Diagnóstico

A página `src/routes/login.tsx` e o `OnboardingGate` em `src/routes/__root.tsx` ainda existem e estão registrados na route tree (`LoginRoute` presente em `routeTree.gen.ts`). O fluxo está quase intacto, mas há **dois pontos quebrados** que impedem o redirecionamento para o Onboarding após login:

1. **Google OAuth aponta para rota inexistente** — em `login.tsx`, `signInWithOAuth` usa `redirectTo: window.location.origin + '/dashboard'`. A rota `/dashboard` não existe no projeto (só temos `/`, `/caixa`, `/gestao`, etc.), então o callback do Google cai em 404.
2. **Login por e-mail novo usuário vai para `/gestao`** — após signup com e-mail, o código navega para `/gestao` em vez de `/`. O `OnboardingGate` intercepta e mostra o `<Onboarding />` quando `!onboardingCompleted`, então funciona, mas o destino correto e idiomático é `/`.

Além disso, o `OnboardingGate` em `__root.tsx` na linha 152-158 chama `navigate()` mas continua renderizando `<AppShell />`, causando flash da rota `/login` antes do redirect — pequeno polish.

## Plano

Trabalhar exclusivamente em `src/routes/login.tsx` e (opcional) `src/routes/__root.tsx`. Sem mudanças no Onboarding, store, ou banco.

### Ação 1 — `src/routes/login.tsx`
- Trocar `redirectTo: window.location.origin + '/dashboard'` por `redirectTo: window.location.origin + '/'` no `signInWithOAuth` do Google. O `OnboardingGate` na rota `/` já detecta sessão + perfil incompleto e renderiza `<Onboarding />`.
- Trocar `navigate({ to: "/gestao" })` por `navigate({ to: "/" })` no fluxo de e-mail/senha (login e signup). Mesma justificativa: `OnboardingGate` decide entre Onboarding ou AppShell.
- Substituir o `alert("Verifique seu e-mail...")` por uma mensagem inline (mantém estética premium, sem emoji), exibida no mesmo bloco de `error`.
- Manter intactos: layout, tipografia, botão Google com SVG inline, formulário e-mail/senha, alternância login/cadastro.

### Ação 2 — `src/routes/__root.tsx` (polish opcional)
- No bloco `if (session && pathname === "/login")`, retornar o spinner de loading enquanto o `navigate` resolve, evitando flash do AppShell sobre a rota `/login`.

### Verificação
- Confirmar que após login Google ou e-mail, o usuário cai em `/` e o `OnboardingGate` decide:
  - `onboarding_completed = false` → mostra `<Onboarding />`
  - `onboarding_completed = true` → mostra `<AppShell />`
- Sem erros de tipo (rotas referenciadas existem).

### Fora de escopo
- Nada de mudanças no componente `Onboarding`, na store, em RLS, em `profiles`, ou em outras rotas.
- Sem novas dependências.