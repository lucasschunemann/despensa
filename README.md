# Despensa

Lista de compras compartilhada (Lucas + Bela). Vite + React + TypeScript, Supabase (Postgres + Realtime).

## Setup (uma vez)

**Primeira vez com Supabase? Siga o [guia passo a passo](docs/SUPABASE.md).** Ele explica tudo do zero.

Resumo para quem já conhece:

1. Crie um projeto no Supabase e ligue **Authentication → Sign In / Providers → Allow anonymous sign-ins**.
2. No **SQL Editor**, rode `supabase/migrations/20260915000000_init.sql`.
3. Crie a sala e guarde o código: `insert into public.rooms default values returning code;`
4. `cp .env.example .env` e preencha com a Project URL e a publishable key (botão **Connect**).
5. `npm install && npm run dev`, depois abra `/?sala=<code>`.

No iOS, adicione à Tela de Início **a partir do link com `?sala=`**: o app da tela inicial não compartilha
dados com o Safari, então o código precisa estar na URL salva.

## Como funciona

- **Entrada**: um campo só. Quantidade sai do texto: `2 leite`, `500g queijo`, `pão x6`, `ovos 12`.
- **Pegado**: toque no item. Toque de novo desfaz. `×` remove.
- **Finalizar compra**: guarda um snapshot raw da lista em `list_archives` (só os 3 últimos ficam),
  remove os pegados e mantém os pendentes para a próxima ida. Recuperação por enquanto é pelo painel do Supabase.
- **Quem adicionou**: escolhido uma vez por aparelho (localStorage).

## Onde mexer na etapa 2 (microinterações)

Os três momentos de feedback estão com placeholders simples, marcados em `src/index.css`
(seção "PLACEHOLDERS") e nas classes `fx-add`, `is-picked` e `fx-complete`
(`src/components/ItemRow.tsx`, `src/components/ListScreen.tsx`).

## Scripts

- `npm run dev`: servidor local (exposto na rede, para testar no celular)
- `npm run build`: typecheck + build
- `npm test`: testes do parser de entrada
