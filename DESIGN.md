# Despensa: sistema visual

Interface clara para consultas rápidas no iPhone em casa e no mercado, com luz ambiente variável. A base usa neutros levemente quentes, tipografia firme e espaço suficiente para o polegar.

## Fundação
- Tema automático por padrão, seguindo o sistema, com escolhas persistentes de claro e escuro nas configurações. `--bg`, `--paper`, `--field` separam níveis sem excesso de contornos.
- Neutros em OKLCH; texto principal escuro, texto auxiliar com mais contraste que a versão inicial.
- Plus Jakarta Sans preserva a identidade; Inter para números tabulares.
- Títulos com tracking negativo. Corpo e controles em escala fixa; inputs com 16px para evitar zoom no Safari.
- No iPhone, os fluxos preservam leitura em uma coluna e safe areas. A partir de 760px, a área chega a 1180px e reorganiza conteúdo em painéis próprios para tablet e desktop.

## Componentes
- Início: saudação e captura rápida formam a coluna pessoal; os resumos acionáveis viram um painel editorial no tablet e desktop.
- Mercado: linhas com emoji, progresso, busca sem acentos, carrinho recolhível e entrada fixa embaixo.
- Contas: bilhetes com picote e código de barras. Pastas coloridas filtram a lista e aceitam movimentação em lote; no iPhone aparecem como uma faixa horizontal e em telas maiores como uma sidebar persistente.
- Desejos: névoa suave e imagens, com identidade distinta.
- Menu: sheet com título e fechamento explícito, atalhos em duas colunas, preferências e área de avisos. Rolagem interna para telas menores.
- Avisos: três exemplos navegáveis, status do aparelho, ação explícita para permissão, teste real pelo servidor e erros contextuais.

## Movimento
Entrada curta e resposta tátil visual no toque. Trocas de módulo têm transição; seleção de exemplo desliza e o conteúdo faz crossfade. Elementos persistentes continuam montados. MotionConfig respeita o sistema; CSS decorativo também tem alternativa de movimento reduzido.

O material translúcido fica nas camadas de navegação e ação — sidebar, composer e trays. Cartões de conteúdo permanecem sólidos para preservar contraste e evitar uma pilha de “vidros”. Seleção, criação de pasta e mudança de destino usam spring curto, escalas pequenas e feedback háptico.

## Acessibilidade
Foco visível, fundo inert sob o menu, retorno de foco ao gatilho, Escape e navegação de tabs por setas. Progresso com valores acessíveis; mensagens de sucesso e erro com status/alert.

## Identidade Pote (21/09/2026)
- A antiga marca com “d” isolado saiu do sistema. O símbolo agora é um pote com folhas, rosto mínimo e traço orgânico; ele continua legível em 20px e também sustenta o ícone instalado do PWA.
- O mascote Pote aparece nos momentos de acolhimento: início, acesso e mapa da casa. Ele não compete com ações frequentes nem substitui os avatares dos moradores.
- Coral queimado é a cor de assinatura. Sálvia identifica mercado, lilás identifica desejos e o preto quente continua concentrado nas contas e ações de alto contraste.
- A tela inicial começa por uma saudação editorial e um resumo da casa, depois captura rápida e módulos com superfícies próprias. Em tablet e desktop, introdução e painel dividem a largura; no iPhone, formam uma sequência única para o polegar.
- O menu é o mapa da casa. Navegação ocupa uma grade curta e a conta fica em uma área separada, reduzindo a mistura entre destino e preferência.

## Redesign mobile (19/09/2026)
- **Escala de texto do iPhone** em tokens (`--t-large` 34, `--t-title` 22, `--t-headline` 17, `--t-body` 16, `--t-sub` 15, `--t-foot` 13, `--t-caption` 12). Nada abaixo de 12px. Margem lateral única, `--gutter` (20px no celular, 28px a partir de 760px).
- **Cabeçalho**: voltar e menu são botões redondos de vidro; ao rolar, o cabeçalho vira vidro com régua fina.
- **Rodapé**: o campo fica sobre uma borda esmaecida da lista (sem régua); ao focar, o campo clareia e ganha sombra.
- **Contas no celular**: pastas (chips com o "+" no fim) e mês rolam junto com as contas, para os bilhetes aparecerem na primeira tela. A pasta ativa é uma pílula preta que desliza entre os chips; os "…" só aparecem na pasta ativa. No tablet e no computador, a barra lateral continua. O cupom começa pelo "falta pagar"; total e pago viram detalhe. "Selecionar" mora no título da seção "a pagar". "Todo mês" é um chip dentro do campo, que encolhe para o ícone enquanto se digita.
- **Mercado** abre no começo da lista. **Desejos** mostram o nome inteiro (até duas linhas) com o preço embaixo.
- **Sons novos**: `tick` (seleção: pasta, mês, menu, "todo mês", nível de vontade), `open` e `close` (entrar e sair de um módulo).
- Todo texto de interface em caixa baixa, inclusive placeholders e "desfazer".
