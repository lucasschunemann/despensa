# Projeto: Despensa

Nome escolhido: **Despensa** — joga com o duplo sentido "despensa" (onde se guarda mantimento) e "des-pensa" (não precisa pensar, é rápido). Reforça a proposta central do produto: tirar o atrito de pensar demais para adicionar um item.

## Contexto
App privado, uso restrito a duas pessoas (Lucas e Bela), que moram juntos. Objetivo: resolver a lista de compras de mercado compartilhada entre os dois, com uma experiência de uso muito acima do que Notion, WhatsApp ou apps de lista genéricos oferecem hoje. Não é um produto público, não terá onboarding nem marketing. É validação de uma hipótese de design (tensão entre rapidez e experiência satisfatória) através de um caso real de uso diário.

## Objetivo do MVP
Resolver bem UMA coisa: adicionar item rápido, ver a lista organizada, marcar como "pegado" durante a compra no mercado, com feedback de uso satisfatório (visual e sonoro) nos momentos certos. Nada além disso na primeira versão.

## Stack
- Front-end: Vite + React + TypeScript (SPA/PWA). Microinterações da etapa 2 devem usar uma lib de animação adequada (ex: Motion)
- Back-end/dados: Supabase (Postgres + Realtime para sincronização entre os dois dispositivos)
- Sem sistema de login tradicional (sem email/senha/recuperação de senha). Acesso via link/código de "sala" privada fixo, só para os dois. Implementação: sign-in anônimo invisível + RPC `join_room(code)`; RLS por membro da sala

## Branding (definido em 16/09/2026)
- Nome sempre em **caixa baixa**: "despensa". Vale para a marca na tela, o título da aba, o nome do
  app instalado e o manifesto
- Marca: **"d" geométrico** (anel + haste na mesma grade), desenhado em `src/components/Avatar.tsx`
  (`Mark`) e em `scripts/icons.mjs`. Ícone do app: "d" branco sobre preto
- Referência: design suíço, minimalismo caro. Muito branco, régua fina, nada decorativo
- **Tipografia (16/09/2026)**: **Plus Jakarta Sans** em tudo; **Inter só onde tem número**
  (valores, quantidades, resumo), porque tem algarismo de largura fixa e o número não dança quando
  muda. Tokens `--font-sans` e `--font-numeric` em `src/index.css`. As duas são hospedadas no
  projeto (`public/fonts/`, `src/fonts.css`), para não depender do Google e funcionar offline.
  Títulos seguem com `letter-spacing` bem negativo; texto corrido fica quase neutro, porque a
  Jakarta já é estreita
- **Só tema claro.** O modo escuro foi removido a pedido do Lucas
- Paleta monocromática: tinta `#0a0a0a` sobre branco. A única cor fora disso é o vermelho do apagar
  e as cores dos avatares
- **Avatares**: são dois memes de gato com tomate, escolhidos pelo Lucas (16/09/2026). Bela é o gato
  que joga o tomate, Lucas é o gato que desvia dos tomates. Arquivos em `public/avatars/`, gerados
  por `scripts/avatars.mjs` (versão inteira, sem recorte redondo, para as telas grandes; versão
  fechada no gato, redonda, para os avatares pequenos). São o único lugar lúdico do app, por
  contraste com o resto, que é tipografia e branco
- Na tela "quem é você?", **Bela vem primeiro** (ordem de `PEOPLE` em `src/lib/types.ts`)

## Linguagem visual por módulo (17/09/2026)
Base minimalista comum (branco, tinta, Plus Jakarta Sans), mas cada módulo fala a língua da própria
ação. Referências do Lucas: app de mercado "Fresh" (cartão de produto com canto recortado) e
cartões de embarque (picote, recortes redondos, código de barras).

- **Início** (`HomeScreen`): o Lucas aprovou como está. **O app sempre abre aqui**, mesmo que o
  endereço tenha um módulo; a única exceção é tocar num aviso do celular, que chega com
  `?abrir=<módulo>`. Saudação pela hora, quem está com o app aberto, e um
  cartão por módulo já na linguagem dele (prateleira com os emojis do que falta, bilhete preto das
  contas com a próxima a vencer, vidro sobre névoa dos desejos). Tocar no nome do módulo volta
  para cá
- **Mercado = lista limpa com emoji** (`Market.tsx`). A gôndola (toldo, prateleiras, cartões em
  grade) foi testada e **rejeitada pelo Lucas** em 17/09/2026; os emojis ficaram. Cada item é uma
  linha: emoji numa caixinha (dicionário local `src/lib/products.ts`, nunca IA), nome, quantidade,
  e o círculo de pegar do lado do polegar. Pegar (tocar ou arrastar à direita) = o check desenha e o
  emoji voa em arco até o contador do topo; arrastar à esquerda apaga; toque longo reage. Os pegos
  viram **uma linha só** com os emojis empilhados, que abre para devolver; finalizar = o carrinho
  sai rodando
- **Contas = cartão de embarque** (`Ticket.tsx`, `Receipt.tsx`), o módulo preferido do Lucas: cada conta pendente é um bilhete
  preto com canhoto picotado (vencimento) e código de barras estável pelo id. Pagar (tocar no
  canhoto ou arrastar) = laser lê o código, carimbo PAGO bate, canhoto rasga e cai. Paga vira
  bilhete tracejado com carimbo pequeno (tocar desmarca). Lançar = o bilhete "sai da impressora".
  Resumo é cupom de caixa com borda serrilhada; o acerto é um cupom destacável; mês fechado é
  carimbo grande
- **Desejos = etéreo** (`Ether.tsx`): névoa clara (lilás, menta, pêssego, bem pálidos) derivando
  devagar, cartões de vidro flutuando, halo que respira quando os dois querem, corações lilás
  subindo. Realizar = o cartão vira luz (desfoca e sobe com faíscas). É o único lugar com cor
  fora dos avatares, e sempre pálida
- Sons novos combinando: leitor (`scan`), carimbo, papel rasgando, impressora, produto pousando,
  brilho

## Direção de design e experiência
Referência visual: cruzamento entre a linguagem Apple (iOS/macOS) e o minimalismo do Notion. Isso significa fundo limpo, hierarquia tipográfica clara, pouco ruído visual, componentes simples, não uma tela cheia de cor ou ícone decorativo. Minimalismo aqui é ponto de partida, não é sinônimo de estático: a personalidade do produto vive nas animações e microinterações, não em elementos visuais parados na tela. Ou seja, tela parada deve parecer quase simples demais; é a resposta a cada ação do usuário que carrega a sofisticação.

Isso reforça a decisão já tomada sobre o fluxo de entrada: interface enxuta e funcional na base (campo de texto sempre pronto, sem navegação em níveis), com a experiência satisfatória entregue via transição, animação e som nos momentos certos, não via excesso de elementos visuais permanentes na tela.

Os três momentos de feedback (adicionar, marcar como pegado, lista completa) são onde essa direção de design se materializa de fato. O restante da interface deve ficar deliberadamente quieto para que esses três momentos se destaquem por contraste.

## Módulo financeiro (16/09/2026)
Segundo módulo do app: contas da casa, para os mesmos dois. Mesma régua de design da lista
(campo único embaixo, arrastar para os dois lados, molas macias, tudo em caixa baixa).

- **Menu** (`MenuSheet`): folha que sobe de baixo, arrastável, com os módulos, "você é X", avisos e som.
  O módulo aberto fica no hash da URL
- **Dados**: `expenses` (conta de um mês), `recurrences` (o que se repete) e `recurrence_runs`
  (garante um lançamento por mês, e conta apagada não volta). Valores sempre em centavos
- **Apagar conta que se repete** pergunta antes (bug achado no primeiro uso real, 17/09/2026):
  "só deste mês" apaga a linha do mês; "deste mês em diante" chama `stop_recurring`, que desliga a
  recorrência e apaga as pendentes dela a partir daquele mês, inclusive as que já tinham sido
  lançadas em meses futuros. Contas já pagas nunca são apagadas. Conta avulsa apaga direto, com
  desfazer
- **Divisão**: `split` é `'meio'` ou o nome de uma pessoa. O acerto entre os dois considera só o que
  já foi pago e ainda não foi acertado (`settled`), e `settle_month` zera o mês
- **Entrada**: um campo só, `luz 180`, `aluguel 1.850 dia 10`. O valor é o último número do texto
- **Mercado vira conta**: ao finalizar a compra, a lista pergunta o valor e lança "Mercado" já paga
- **Animações**: dinheiro voando ao pagar (`MoneyRain`), valor que conta sozinho (`Money`), régua de
  progresso do mês, mês deslizando na troca, "mês fechado" ao zerar
- Fora de escopo por enquanto: categorias, gráficos, orçamento por categoria, exportação

## Lista de desejos (16/09/2026)
Terceiro módulo. O que dá sentido a ele é o **cofre**: não é vitrine, é fila de espera.

- `wishes` (título, preço, foto, `want_level` 1-3, `wanted_by text[]`, status) e `room_settings`
  (quanto dá para guardar por mês)
- **Fila**: o que os dois querem vem primeiro, depois o nível de vontade, depois o mais antigo
  (`src/lib/wishes.ts`). A soma acumulada dividida pelo que se guarda por mês diz em que mês cada
  desejo sai ("dá em outubro")
- **Corações**: `toggle_want` é RPC para dois toques simultâneos não se sobrescreverem. Quando os
  dois querem, o card ganha contorno
- **Fotos**: balde público `desejos`, caminho `<room_id>/<wish_id>.webp`, reduzidas no navegador
  antes de subir (`src/lib/image.ts`). Público de propósito: os ids são aleatórios e a foto precisa
  carregar direto, inclusive do cache do app
- Comprou → oferece lançar nas contas do mês, igual ao mercado

## Avisos no celular (16/09/2026)
- `push_subscriptions` guarda a assinatura de cada aparelho; a Edge Function `notificar`
  (`supabase/functions/notificar/`) confere a sala pelo token de quem chamou e dispara com a chave
  de serviço, nunca para quem mandou
- Os avisos são **agrupados numa janela de 12s** (`src/lib/notify.ts`): cinco itens seguidos viram
  um aviso só
- O handler fica em `public/push-sw.js` e entra no service worker por `importScripts`
- Chaves VAPID: pública no `.env` e na Vercel; as duas em `.vapid.local.json` (fora do git)
- Depende de o Lucas publicar a função uma vez: [docs/AVISOS.md](docs/AVISOS.md)
- Falta: aviso de conta vencendo (precisa de algo acordando todo dia)

## Reações e easter eggs
- Segurar o dedo num item abre os emojis; a reação vai por broadcast e sobe na tela do outro,
  sem gravar nada no banco
- Palavras com brincadeira em `src/lib/eggs.ts` (tomate, cerveja, ovo, chocolate, pizza, bolo,
  sorvete, café, vinho, flores, viagem, gato)

## Dados por item
- Nome (texto livre)
- Quantidade
- Quem adicionou (Lucas ou Bela)
- Status: pendente / pegado

## Histórico
- Guardar as últimas 3 listas completas (raw), só para recuperação, sem análise em cima disso
- Sugestão automática de recompra por frequência: FORA DO ESCOPO do MVP. Não implementar agora, é next step explícito, não decisão adiada por esquecimento.

## Fluxo de entrada (decisão já validada)
- Entrada é funcional e rápida: campo de texto/busca sempre pronto para digitar, sem navegação em categorias, sem múltiplos toques antes de conseguir adicionar um item
- Categorização visual (ícone, cor por seção do mercado) acontece DEPOIS que o item já foi adicionado, nunca antes, para não atrapalhar velocidade de entrada
- Evitar qualquer estrutura de níveis/subníveis de navegação para adicionar item. O erro a evitar é UX "visual demais" que na prática aumenta cliques

## Momentos de feedback satisfatório (visual + sonoro; tátil é bônus condicionado ao aparelho, já que é PWA)
1. Adicionar item à lista
2. Marcar item como "pegado" (não "comprado") durante a compra
3. Lista completa/zerada

Definidos com o Lucas em 16/09/2026 e implementados:
1. **Adicionar**: item entra com mola (fade + subida de 8px), lista rola até ele, clique seco grave (850 Hz) e vibração leve
2. **Pegado**: círculo preenche com mola, check desenha sozinho, risco cresce da esquerda para a direita, tique agudo (2600 Hz) e vibração média. Desmarcar tem som mais grave
3. **Lista zerada**: overlay com fundo desfocado, círculo e check desenhando-se, dois tiques + nota dó (1046 Hz), vibração de sucesso, some sozinho em 1,9s

Sons são sintetizados em `src/lib/sound.ts` (Web Audio, sem arquivo de áudio), caráter **seco e mecânico**, desligáveis no menu. Vibração (`src/lib/haptics.ts`) é bônus: Android responde, iPhone ignora. Tudo respeita `prefers-reduced-motion`.

No iPhone o áudio exige duas coisas, ambas resolvidas em `sound.ts`: destravar o contexto dentro de
um gesto (buffer mudo no primeiro toque) e declarar `navigator.audioSession.type = 'playback'`, sem o
que a chavinha de silencioso do aparelho cala o app.

Outras microinterações: régua de progresso no topo, etiqueta da quantidade reconhecida enquanto
digita, entrada em cascata na primeira carga, avatar do topo pulsando a cada item marcado, e
**segurar para finalizar** (`HoldButton`) com o texto invertendo conforme a barra passa.

Conviver a dois é o que o app tem de diferente, então isso aparece na tela:
- **Presença ao vivo** (`usePresence`): o avatar da outra pessoa aparece no topo, com um ponto, quando
  ela está com o app aberto. Vai por canal do Realtime, sem tocar no banco
- **"Bela está escrevendo"** acima do campo, por broadcast, no máximo um aviso a cada 1,5s
- **Item que chega do outro** entra com um realce que se apaga em ~2s
- **Arrastar para a direita marca como pegado** (esquerda continua apagando), com vibração no momento
  em que passa do ponto
- **Easter eggs**: palavras como "tomate" fazem chover o emoji correspondente (`Toss`, `src/lib/eggs.ts`)

## Referência de experiência (com ressalva)
Benchmark citado: The Coffee (rede de cafeterias brasileira), fluxo de pedido em tablet de autoatendimento na loja física — não o app mobile, que tem reclamações de confiabilidade em avaliações de usuários. O que vale copiar é a sensação de interação num ambiente controlado (hardware dedicado, sem concorrência de atenção), não o app em si.

## Fora de escopo do MVP (explícito, para não crescer sozinho)
- Sugestão automática de itens recorrentes
- Categorização automática via LLM
- Qualquer autenticação além de acesso por link/código de sala privada
- Publicação como produto público

## Decisões de interface (16/09/2026)
- **Campo de adicionar fixo embaixo**. O app tem a altura da área visível (`useViewportFit` via visualViewport), então o teclado encolhe o app em vez de empurrar a tela. Mobile first: alcance do polegar
- **Mercado**: lista em ordem de chegada, pegos recolhidos numa linha (ver "Linguagem visual por módulo")
- **Nos três módulos, apagar é arrastar para a esquerda** e pegar/pagar/realizar é arrastar para a direita. Sempre com desfazer
- **Arrastar nunca vira toque**: começar o arrasto em cima de um botão (canhoto, foto, coração) não aciona o botão ao soltar. Foi um bug real: arrastar para apagar pagava a conta
- **O avatar de quem adicionou só aparece nos itens do outro**, para tirar ruído repetido
- **Interruptores** são trilho + bolinha com caixa própria (`.switch`): a bolinha anda dentro do trilho, nunca por cima do texto
- Cor e tema: ver Branding (monocromático, só claro)

## Etapas
1. ~~Base funcional: projeto + Supabase/Realtime + schema + tela simples (adicionar, lista compartilhada, marcar pegado)~~
2. ~~Estilo visual e microinterações (animação, som, tátil), PWA instalável~~
3. Próximos passos possíveis: categorização visual por seção do mercado (depois do item entrar na lista), tela para ver as 3 últimas listas, sugestão de recompra por frequência (segue fora do MVP)
