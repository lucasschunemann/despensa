# Despensa

Lista de compras compartilhada (Lucas + Bela). Vite + React + TypeScript, Supabase (Postgres + Realtime).

## Setup (uma vez)

**Primeira vez com Supabase? Siga o [guia passo a passo](docs/SUPABASE.md).** Ele explica tudo do zero.

Resumo para quem já conhece:

1. Crie um projeto no Supabase e ligue **Authentication → Sign In / Providers → Allow anonymous sign-ins**.
2. No **SQL Editor**, rode as migrations de `supabase/migrations/` em ordem de nome
   (`20260915000000_init.sql`, depois `20260916000000_financeiro.sql`).
3. Crie a sala e guarde o código: `insert into public.rooms default values returning code;`
4. `cp .env.example .env` e preencha com a Project URL e a publishable key (botão **Connect**).
5. `npm install && npm run dev`, depois abra `/?sala=<code>`.

No iOS, adicione à Tela de Início **a partir do link com `?sala=`**: o app da tela inicial não compartilha
dados com o Safari, então o código precisa estar na URL salva.

## Os dois módulos

O menu (botão no topo direito) troca entre **lista de mercado** e **contas do mês**. O módulo aberto
fica na URL (`#lista` / `#contas`), então recarregar volta onde estava.

## Contas do mês

- **Lançar**: um campo só, igual à lista. `luz 180`, `aluguel 1.850 dia 10`, `internet r$ 129,90`.
  O valor é o último número; `dia N` vira o vencimento; o resto é o nome.
- **Todo mês**: ligue o botão antes de lançar e a conta volta sozinha todo mês. Se você apagar a
  conta de um mês, ela não ressuscita naquele mês.
- **Pagar**: toque na conta, ou arraste para a direita. Chove dinheiro na tela.
- **Quem pagou** fica registrado com o avatar de quem marcou.
- **Divisão**: o chip `½` divide ao meio. Toque nele para alternar entre meio a meio, só sua, só dela.
- **Quem deve a quem**: o resumo calcula, considerando só o que já foi pago e ainda não foi acertado.
  O botão **acertamos** zera a conta entre vocês.
- **Mercado vira conta**: ao finalizar uma compra na lista, o app pergunta quanto deu e lança a conta
  "Mercado" do mês, já paga.
- **Mês fechado**: quando não falta nada, a tela comemora.

## Como funciona (lista de mercado)

- **Entrada**: um campo só, fixo embaixo. O app tem exatamente a altura da área visível, então o
  teclado não empurra a tela: ele encolhe o app e a lista continua inteira acima do teclado.
- **Quantidade**: sai do próprio texto, antes ou depois do nome, e aparece como etiqueta no campo
  enquanto você digita. Unidades reconhecidas (maiúsculas ou minúsculas, coladas ou separadas):

  | Tipo | Formas aceitas |
  |---|---|
  | Multiplicador | `x` — `2x pão`, `pão x6` |
  | Unidade | `un`, `und`, `unid`, `u` — `2 und ovos` |
  | Peso | `kg`, `g`, `mg` — `500g queijo`, `1,5 kg carne` |
  | Volume | `l`, `lt`, `ml` — `5 L água`, `350ml suco` |
  | Embalagem | `cx`, `pct`, `pc`, `dz`, `sc`, `fd` — `3 cx leite`, `sabão 1 pct` |

  Número sozinho também vale (`ovos 12`). A lista fica em `src/lib/parse.ts`: se acrescentar uma
  unidade lá, acrescente aqui também.
- **Pegado**: toque no item, ou arraste para a direita. Toque de novo desfaz.
- **Apagar**: arraste o item para a esquerda. Dá para desfazer por 5 segundos.
- **Finalizar**: segure o botão. A barra preenchendo é o aviso, no lugar de uma caixa de confirmação.
- **Avatares**: os dois gatos com tomate, em `public/avatars/`. Aparecem só nos itens que a outra
  pessoa adicionou. O avatar do topo dá um pulinho a cada item que você marca.
  Para trocar as imagens: `node scripts/avatars.mjs <imagem-da-bela> <imagem-do-lucas>`.
- **Quem está junto**: se a outra pessoa estiver com o app aberto, o avatar dela aparece no topo com
  um ponto, e "Bela está escrevendo" aparece acima do campo enquanto ela digita. Isso não passa pelo
  banco, é só o canal ao vivo.
- **Item que chega do outro** entra com um realce que se apaga sozinho.
- Escreva "tomate" e veja o que acontece.
- **Som e vibração**: os três momentos (adicionar, pegar, zerar) têm som sintetizado na hora, sem
  arquivo de áudio. O ícone no topo liga e desliga. Vibração funciona no Android; o iPhone ignora.
- **Finalizar compra**: guarda um snapshot raw da lista em `list_archives` (só os 3 últimos ficam),
  remove os pegados e mantém os pendentes para a próxima ida. Recuperação por enquanto é pelo painel do Supabase.
- **Quem adicionou**: escolhido uma vez por aparelho (localStorage).

## Mexer no visual e nas animações

`npm run dev` e abra **`http://localhost:5173/?demo=1`**: roda a interface com itens de mentira,
sem Supabase e sem tocar na lista real. Serve para ajustar animação e layout à vontade.
Variações: `&contas=1` (módulo financeiro), `&menu=1` (menu aberto), `&vazio=1` (sem dados),
`&quem=1` (tela de quem é você), `&digitando=1` (aviso de "está escrevendo"). Esse modo só existe
em desenvolvimento.

Onde fica cada coisa:

| O quê | Arquivo |
|---|---|
| Cores, tipografia, espaçamentos | `src/index.css` (topo, seção Tokens) |
| Avatares, marca "d" e tomate | `src/components/Avatar.tsx` |
| Presença e "está escrevendo" | `src/hooks/usePresence.ts` |
| Easter egg do tomate | `src/components/TomatoToss.tsx` |
| Sons dos três momentos | `src/lib/sound.ts` |
| Vibração | `src/lib/haptics.ts` |
| Linha do item: arrastar, check, risco | `src/components/ItemRow.tsx` |
| Campo de adicionar | `src/components/Composer.tsx` |
| Tela da lista, desfazer, finalizar | `src/components/ListScreen.tsx` |
| Comemoração da lista zerada | `src/components/CompleteOverlay.tsx` |
| Botão de segurar para finalizar | `src/components/HoldButton.tsx` |
| Menu dos módulos | `src/components/MenuSheet.tsx` |
| Tela das contas | `src/components/FinanceScreen.tsx` |
| Linha da conta | `src/components/ExpenseRow.tsx` |
| Dinheiro voando e valor animado | `src/components/Money.tsx` |
| Contas do mês (dados) | `src/hooks/useExpenses.ts` |
| Leitura de "luz 180" e formatação | `src/lib/money.ts` |
| Quem deve a quem | `src/lib/balance.ts` |
| Ícones do app | `scripts/icons.mjs` (rode `node scripts/icons.mjs` depois de mudar) |

## Scripts

- `npm run dev`: servidor local (exposto na rede, para testar no celular)
- `npm run build`: typecheck + build
- `npm test`: testes do leitor de quantidade
