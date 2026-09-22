# Despensa: sistema visual

Interface monocromática para consultas rápidas no iPhone em casa e no mercado, com luz ambiente variável. A base usa preto, branco e cinzas neutros, tipografia firme e espaço suficiente para o polegar.

## Fundação
- Tema automático por padrão, seguindo o sistema, com escolhas persistentes de claro e escuro nas configurações. `--bg`, `--paper`, `--field` separam níveis sem excesso de contornos.
- A cor não separa módulos nem decora superfícies. Ela aparece somente quando comunica erro, perigo ou uma escolha de cor feita pelo usuário.
- Plus Jakarta Sans preserva a identidade; Inter para números tabulares.
- Títulos com tracking negativo. Corpo e controles em escala fixa; inputs com 16px para evitar zoom no Safari.
- No iPhone, os fluxos preservam leitura em uma coluna e safe areas. A partir de 760px, a área chega a 1180px e reorganiza conteúdo em painéis próprios para tablet e desktop.

## Componentes
- Início: saudação, captura unificada e uma lista de réguas finas para os três módulos. Sem cartão, sem barra de progresso e sem número agregado: o conteúdo fica direto no papel e o respiro faz a separação. A linha de estado só aparece quando tem o que dizer. A barra Liquid Glass mantém os quatro destinos ao alcance do polegar em todas as telas.
- Mercado: linhas com emoji, progresso, busca sem acentos, carrinho recolhível e entrada fixa embaixo.
- Contas: bilhetes com picote e código de barras. Pastas coloridas filtram a lista e aceitam movimentação em lote; no iPhone aparecem como uma faixa horizontal e em telas maiores como uma sidebar persistente.
- Desejos: cartões sólidos, imagens e reações expressivas dentro da mesma escala monocromática.
- Menu: sheet com conta separada e destinos em lista; o destino atual recebe seleção invertida e animada. Preferências vivem no painel de usuário.
- Avisos: três exemplos navegáveis, status do aparelho, ação explícita para permissão, teste real pelo servidor e erros contextuais.
- Onboarding: cinco cenas curtas e interativas apresentam captura, sincronização, organização e avisos. O progresso é sempre visível, cada cena aceita gesto horizontal e a saída devolve diretamente ao início. No primeiro acesso, a conclusão é salva na conta e no aparelho; depois, a apresentação fica em configurações.
- O rodapé do onboarding usa contador fixo, voltar circular e ação curta para não quebrar até 320 px. Os ícones da demonstração são os mesmos vetores da navegação real, sem glifos dependentes da fonte do aparelho.

## Movimento
Entrada curta e resposta tátil visual no toque. Trocas de módulo têm transição; seleção de exemplo desliza e o conteúdo faz crossfade. Elementos persistentes continuam montados. MotionConfig respeita o sistema; CSS decorativo também tem alternativa de movimento reduzido.

O onboarding concentra a animação mais expressiva do produto: a marca entra em órbita, exemplos são interpretados, uma compra viaja entre moradores, contas se reorganizam e um aviso fecha a história. A navegação continua imediata, sem avanço automático, com transições direcionais de 340–460 ms e controles sempre disponíveis.

O material translúcido fica nas camadas de navegação e ação — sidebar, composer e trays. Cartões de conteúdo permanecem sólidos para preservar contraste e evitar uma pilha de “vidros”. Seleção, criação de pasta e mudança de destino usam spring curto, escalas pequenas e feedback háptico.

## Acessibilidade
Foco visível, fundo inert sob o menu, retorno de foco ao gatilho, Escape e navegação de tabs por setas. Progresso com valores acessíveis; mensagens de sucesso e erro com status/alert.

## Identidade camarão saxofonista (21/09/2026)
- A marca fornecida combina um camarão coral e um saxofone dourado. Ela aparece no cabeçalho, no favicon e no ícone instalado do PWA. Os ícones saem da própria arte por `node scripts/icons.mjs`, que recorta a margem transparente e centraliza.
- A ilustração completa aparece somente em momentos de orientação, como início e acesso. Ela não compete com ações frequentes nem substitui os avatares dos moradores.
- A interface continua monocromática: preto, branco e cinzas mudam de papel entre os temas claro e escuro. A marca é a exceção deliberada, com o coral do camarão e o dourado do saxofone; cores de pasta permanecem uma escolha funcional do usuário.
- A tela inicial começa pelo estado da casa, oferece captura direta para os três módulos e termina em uma fila curta de ações. Em tablet e desktop, o resumo fica ao lado das ações; no iPhone, forma uma sequência única para o polegar.
- O menu separa claramente perfil e navegação. Os destinos formam uma lista, com seleção invertida que desliza entre eles.
- A navegação principal é persistente e usa material Liquid Glass: cápsula flutuante, desfoque do conteúdo, reflexo preso à borda de cima, brilho interno e uma lente de vidro que desliza até o destino atual.

### Até onde o Liquid Glass chega na web
O material de verdade é nativo: `glassEffect(_:in:)` no SwiftUI e `UIGlassEffect` no UIKit.
Página web nenhuma consegue chamar isso. A propriedade `-apple-visual-effect` existe, mas é
privada e só responde dentro de WKWebView com um ajuste interno ligado — não no Safari nem em
PWA. E a técnica que a web usa para imitar (refração por `feDisplacementMap` dentro de
`backdrop-filter: url(#…)`) **só funciona em Chromium**: o WebKit ignora e cai em desfoque
simples, então no iPhone do Lucas seria código morto.

O que dá para fazer é cumprir a especificação do material com o que o WebKit suporta, que é o
que o app faz, seguindo <https://developer.apple.com/design/human-interface-guidelines/materials>:

- **Variante `regular`**, que é a que a Apple usa na maioria dos componentes: além de desfocar,
  ela **ajusta a luminosidade** do que está atrás. Daí o `brightness()` no `backdrop-filter` —
  clareia no tema claro (`1.08`) e escurece no escuro (`.72`). A variante `clear` não se aplica:
  ela é para componentes sobre foto e vídeo.
- **Camada funcional, nunca camada de conteúdo.** O vidro fica na barra e nas folhas que sobem.
  Fundo de tela e cartão usam material comum.
- **Efeito de borda de rolagem**: o conteúdo perde opacidade antes de passar por baixo da barra.
- **Responde às preferências do sistema**, como a especificação manda: `prefers-reduced-transparency`
  deixa o vidro sólido, `prefers-contrast: more` encorpa borda e fundo.
- Todo o material sai de tokens (`--lg-*`), definidos por tema, para claro e escuro não
  divergirem de novo.

### O que as HIG de tab bars mandam, e como o app cumpre
Fonte: <https://developer.apple.com/design/human-interface-guidelines/tab-bars>.

- **Navegação, nunca ação.** As quatro abas são só destinos. Ação de tela fica na barra do módulo.
- **Sempre visível.** A barra acompanha os quatro módulos. A única exceção prevista é folha modal por cima: o menu e as configurações ficam acima dela e a cobrem.
- **Rótulo de uma palavra.** início, mercado, contas, desejos.
- **Ícone preenchido**, que é o que a plataforma usa. Só a alça da cesta é traço, porque preenchida vira borrão.
- **Ícone acima do rótulo em vista compacta, ao lado em vista normal.** No celular fica empilhado; a partir de 760px a aba deita e a cápsula encolhe para caber no conteúdo.
- **Nunca desabilitar nem esconder aba**, mesmo sem conteúdo. Lista vazia continua abrindo e explica que está vazia.
- **Sem aba de excesso.** São quatro, cabem em qualquer largura.
- **Selo só para informação crítica.** Conta vencida vira oval vermelho com número branco na aba de contas; acima de nove vira `!`. Item de mercado e desejo não ganham selo, para o selo não perder o sentido.
- **Cor.** A barra é monocromática, como as HIG pedem quando o conteúdo já tem cor própria. O vermelho do selo é o mesmo do apagar.
- **Encolher ao descer a leitura** e sair do estado encolhido **só de dois jeitos: tocar numa aba ou voltar ao topo da tela.** Rolar um pouco para cima não devolve a barra. A cápsula se contrai até sobrar a aba atual, em pílula com ícone e nome lado a lado, com a largura animada por layout.
- Ressalva honesta: as HIG descrevem o encolhimento para barra **com acessório acoplado** (o MiniPlayer do Music). A despensa não tem acessório, então o comportamento foi mantido por pedido do Lucas, não porque a Apple o prescreva neste caso.

- A cápsula invade parte da área do indicador da tela, como a do iOS, em vez de ficar inteira acima dela: `--dock-gap` é `max(10px, safe-area-bottom - 15px)`, e `--dock-h` dá o respiro dos compositores dos módulos.
- **Cor que pinta fundo e cor que pinta texto são tokens separados.** No escuro o vermelho de
  texto precisa clarear e o de fundo precisa fechar — o mesmo valor não serve para os dois. Daí
  `--danger` (texto e ícone) e o par `--danger-surface` / `--danger-on` (arrastar para apagar,
  selo da barra). Vale a mesma regra do `--ink`: se o token aparece em `background` e em `color`,
  ele está fazendo dois trabalhos.
- **Superfície invertida usa `--solid` e `--solid-text`, nunca `--ink` com branco fixo.** `--ink` é
  cor de texto e inverte com o tema: como fundo de item selecionado ela fica quase branca no escuro,
  e o texto branco por cima some. Foi o que aconteceu com a pasta selecionada das contas. Percurso
  em `e2e/tema.e2e.ts` mede o contraste e barra a volta do problema.
- Os avatares são WebP **com alfa**: o fundo branco do meme é recortado por preenchimento a partir
  da borda em `scripts/avatars.mjs`, que anda só por branco vizinho para não furar o pelo claro do
  gato, encolhe a silhueta em um pixel para não sobrar franja acesa no escuro, e esfuma a borda.
  `node scripts/avatars.mjs` sem argumento refaz o recorte dos arquivos que já estão no projeto.
- Texto: fragmento curto e concreto, sem ponto final e sem frase de efeito. Onde não há o que dizer, não entra linha nenhuma. A linha abaixo do campo devolve o que o app entendeu do que está escrito.
- O cabeçalho mostra só a marca escrita. A ilustração não entra em barra de navegação: ela aparece grande no início.

## Apresentação (22/09/2026)
Refeita na parte visual. A anterior era o padrão de mercado — cartão, barra de progresso,
arte, título, "continuar" — e foi trocada por uma ideia diferente: **em vez de ler cinco
cartões, a pessoa faz os gestos de verdade do app.**

- **Seis cenas, quatro delas interativas.** Escrever manda um exemplo para o destino certo;
  pegar é arrastar a linha para a direita; pagar é o canhoto do bilhete, com laser, carimbo e
  o canhoto caindo; desejar é o coração até os dois quererem. O gesto ensinado é o mesmo do
  módulo, então a apresentação treina em vez de narrar.
- **O botão de avançar nasce depois do gesto**, nunca antes. Quem não faz, não avança — e quem
  não quer usa "pular", sempre visível.
- **Progresso é uma pauta musical** com o camarão pulando de nota em nota (`layoutId`), no lugar
  dos pontinhos.
- **O fundo troca de língua junto com a cena**: papel liso, grade de papel milimetrado nas
  contas, névoa lilás/menta/pêssego nos desejos. Cada cena entra e sai com uma transição
  própria, em vez do mesmo deslize.
- **Tocar em qualquer lugar solta notas musicais** do dedo.
- **O fim é a barra de verdade**, com os mesmos ícones preenchidos e a lente de vidro na aba
  atual, para a última tela já ser o app.
- **Aqui `prefers-reduced-motion` é ignorado de propósito**, a pedido do Lucas: a apresentação
  É a animação. O resto do app continua respeitando.
- O encanamento do GPT foi preservado inteiro: `src/lib/onboarding.ts` (cópia local + metadado
  da conta), o gatilho na primeira entrada e o "reassistir" nas configurações.

## Redesign mobile (19/09/2026)
- **Escala de texto do iPhone** em tokens (`--t-large` 34, `--t-title` 22, `--t-headline` 17, `--t-body` 16, `--t-sub` 15, `--t-foot` 13, `--t-caption` 12). Nada abaixo de 12px. Margem lateral única, `--gutter` (20px no celular, 28px a partir de 760px).
- **Cabeçalho**: voltar e menu são botões redondos de vidro; ao rolar, o cabeçalho vira vidro com régua fina.
- **Rodapé**: o campo fica sobre uma borda esmaecida da lista (sem régua); ao focar, o campo clareia e ganha sombra.
- **Contas no celular**: pastas (chips com o "+" no fim) e mês rolam junto com as contas, para os bilhetes aparecerem na primeira tela. A pasta ativa é uma pílula preta que desliza entre os chips; os "…" só aparecem na pasta ativa. No tablet e no computador, a barra lateral continua. O cupom começa pelo "falta pagar"; total e pago viram detalhe. "Selecionar" mora no título da seção "a pagar". "Todo mês" é um chip dentro do campo, que encolhe para o ícone enquanto se digita.
- **Mercado** abre no começo da lista. **Desejos** mostram o nome inteiro (até duas linhas) com o preço embaixo.
- **Sons novos**: `tick` (seleção: pasta, mês, menu, "todo mês", nível de vontade), `open` e `close` (entrar e sair de um módulo).
- Todo texto de interface em caixa baixa, inclusive placeholders e "desfazer".
