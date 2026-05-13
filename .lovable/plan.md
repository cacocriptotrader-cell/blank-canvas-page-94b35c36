## Plano: Exportar PDF do Ledger (estilo extrato bancário)

### 1. Dependências
Instalar:
```
bun add jspdf jspdf-autotable
```

### 2. Nova função `handleDownloadPDF` em `src/routes/caixa.tsx`
Adicionar logo após `exportCSV()`:

- Importar `jsPDF` e `autoTable` no topo do arquivo.
- Reaproveitar `store.shifts` + `store.workplaces` (mesma fonte usada por `billingByMonth`), ordenando por data desc.
- Construir vetorialmente (sem html2canvas).

Estrutura do PDF (A4, fundo branco, texto preto):
- **Cabeçalho:** "DOCFIN — EXTRATO DE RENDIMENTOS" em negrito 16pt.
- **Subcabeçalho:** nome do usuário (`store.profile?.name ?? "Titular da conta"`) e período (`primeira data – última data` ou mês corrente se vazio), 10pt cinza-escuro.
- **Linha divisória** fina preta.
- **Tabela `autoTable`:** colunas `[Data, Hospital, Regime, Valor Bruto]`, theme `plain`, header em negrito com borda inferior, linhas zebradas suaves (#f5f5f5), valores monetários alinhados à direita usando `brl()`.
- **Linha final "Total Geral"** em negrito mesclando as 3 primeiras colunas, valor à direita = soma de `gross`.
- **Rodapé** discreto: `Emitido em {data} · Docfin` no `didDrawPage`.

Download: `doc.save("extrato_docfin.pdf")` + toast "Relatório PDF exportado com sucesso".

### 3. Conectar o botão existente
Trocar o handler do botão "Gerar PDF" (linha 170) de `() => exportReport("pdf")` para `handleDownloadPDF`. Simplificar `exportReport` ou removê-la (manter só `exportCSV` e `handleDownloadPDF`).

### Fora de escopo
Sem mudanças em store, rotas, banco, ou no `ExecutiveReport.tsx`. Sem alterações de estética nos demais blocos do Ledger.
