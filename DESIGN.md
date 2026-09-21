# Despensa: sistema visual

Interface monocromática para consultas rápidas no iPhone em casa e no mercado, com luz ambiente variável. A base usa preto, branco e cinzas neutros, tipografia firme e espaço suficiente para o polegar.

## Fundação
- Tema automático por padrão, seguindo o sistema, com escolhas persistentes de claro e escuro nas configurações. `--bg`, `--paper`, `--field` separam níveis sem excesso de contornos.
- A cor não separa módulos nem decora superfícies. Ela aparece somente quando comunica erro, perigo ou uma escolha de cor feita pelo usuário.
- Plus Jakarta Sans preserva a identidade; Inter para números tabulares.
- Títulos com tracking negativo. Corpo e controles em escala fixa; inputs com 16px para evitar zoom no Safari.
- No iPhone, os fluxos preservam leitura em uma coluna e safe areas. A partir de 760px, a área chega a 1180px e reorganiza conteúdo em painéis próprios para tablet e desktop.

## Componentes
- Início: um resumo mostra o que pede atenção, a captura unificada adiciona mercado, conta ou desejo e a área “agora” abre cada fluxo. A barra Liquid Glass mantém os quatro destinos ao alcance do polegar em todas as telas.
- Mercado: linhas com emoji, progresso, busca sem acentos, carrinho recolhível e entrada fixa embaixo.
- Contas: bilhetes com picote e código de barras. Pastas coloridas filtram a lista e aceitam movimentação em lote; no iPhone aparecem como uma faixa horizontal e em telas maiores como uma sidebar persistente.
- Desejos: cartões sólidos, imagens e reações expressivas dentro da mesma escala monocromática.
- Menu: sheet com conta separada e destinos em lista; o destino atual recebe seleção invertida e animada. Preferências vivem no painel de usuário.
- Avisos: três exemplos navegáveis, status do aparelho, ação explícita para permissão, teste real pelo servidor e erros contextuais.

## Movimento
Entrada curta e resposta tátil visual no toque. Trocas de módulo têm transição; seleção de exemplo desliza e o conteúdo faz crossfade. Elementos persistentes continuam montados. MotionConfig respeita o sistema; CSS decorativo também tem alternativa de movimento reduzido.

O material translúcido fica nas camadas de navegação e ação — sidebar, composer e trays. Cartões de conteúdo permanecem sólidos para preservar contraste e evitar uma pilha de “vidros”. Seleção, criação de pasta e mudança de destino usam spring curto, escalas pequenas e feedback háptico.

## Acessibilidade
Foco visível, fundo inert sob o menu, retorno de foco ao gatilho, Escape e navegação de tabs por setas. Progresso com valores acessíveis; mensagens de sucesso e erro com status/alert.

## Identidade camarão saxofonista (21/09/2026)
- A marca fornecida combina um camarão coral e um saxofone dourado. Ela aparece no cabeçalho, no favicon e no ícone instalado do PWA.
- A ilustração completa aparece somente em momentos de orientação, como início e acesso. Ela não compete com ações frequentes nem substitui os avatares dos moradores.
- A interface continua monocromática: preto, branco e cinzas mudam de papel entre os temas claro e escuro. A marca é a exceção deliberada, com o coral do camarão e o dourado do saxofone; cores de pasta permanecem uma escolha funcional do usuário.
- A tela inicial começa pelo estado da casa, oferece captura direta para os três módulos e termina em uma fila curta de ações. Em tablet e desktop, o resumo fica ao lado das ações; no iPhone, forma uma sequência única para o polegar.
- O menu separa claramente perfil e navegação. Os destinos formam uma lista, com seleção invertida que desliza entre eles.
- A navegação principal é persistente e usa material Liquid Glass: desfoque do conteúdo, reflexo de borda, brilho interno e uma lente animada que acompanha o destino atual.

## Redesign mobile (19/09/2026)
- **Escala de texto do iPhone** em tokens (`--t-large` 34, `--t-title` 22, `--t-headline` 17, `--t-body` 16, `--t-sub` 15, `--t-foot` 13, `--t-caption` 12). Nada abaixo de 12px. Margem lateral única, `--gutter` (20px no celular, 28px a partir de 760px).
- **Cabeçalho**: voltar e menu são botões redondos de vidro; ao rolar, o cabeçalho vira vidro com régua fina.
- **Rodapé**: o campo fica sobre uma borda esmaecida da lista (sem régua); ao focar, o campo clareia e ganha sombra.
- **Contas no celular**: pastas (chips com o "+" no fim) e mês rolam junto com as contas, para os bilhetes aparecerem na primeira tela. A pasta ativa é uma pílula preta que desliza entre os chips; os "…" só aparecem na pasta ativa. No tablet e no computador, a barra lateral continua. O cupom começa pelo "falta pagar"; total e pago viram detalhe. "Selecionar" mora no título da seção "a pagar". "Todo mês" é um chip dentro do campo, que encolhe para o ícone enquanto se digita.
- **Mercado** abre no começo da lista. **Desejos** mostram o nome inteiro (até duas linhas) com o preço embaixo.
- **Sons novos**: `tick` (seleção: pasta, mês, menu, "todo mês", nível de vontade), `open` e `close` (entrar e sair de um módulo).
- Todo texto de interface em caixa baixa, inclusive placeholders e "desfazer".
