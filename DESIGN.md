# Despensa: sistema visual

Interface clara para consultas rápidas no iPhone em casa e no mercado, com luz ambiente variável. A base usa neutros levemente quentes, tipografia firme e espaço suficiente para o polegar.

## Fundação
- Tema claro; `--bg`, `--paper`, `--field` separam níveis sem excesso de contornos.
- Neutros em OKLCH; texto principal escuro, texto auxiliar com mais contraste que a versão inicial.
- Plus Jakarta Sans preserva a identidade; Inter para números tabulares.
- Títulos com tracking negativo. Corpo e controles em escala fixa; inputs com 16px para evitar zoom no Safari.
- Áreas principais limitadas a 600px; safe areas do iPhone preservadas.

## Componentes
- Início: saudação, campo rápido para o mercado e resumos acionáveis dos três módulos.
- Mercado: linhas com emoji, progresso, busca sem acentos, carrinho recolhível e entrada fixa embaixo.
- Contas: bilhetes com picote e código de barras. As metáforas existentes de leitura e pagamento permanecem.
- Desejos: névoa suave e imagens, com identidade distinta.
- Menu: sheet com título e fechamento explícito, atalhos em duas colunas, preferências e área de avisos. Rolagem interna para telas menores.
- Avisos: três exemplos navegáveis, status do aparelho, ação explícita para permissão, teste real pelo servidor e erros contextuais.

## Movimento
Entrada curta e resposta tátil visual no toque. Trocas de módulo têm transição; seleção de exemplo desliza e o conteúdo faz crossfade. Elementos persistentes continuam montados. MotionConfig respeita o sistema; CSS decorativo também tem alternativa de movimento reduzido.

## Acessibilidade
Foco visível, fundo inert sob o menu, retorno de foco ao gatilho, Escape e navegação de tabs por setas. Progresso com valores acessíveis; mensagens de sucesso e erro com status/alert.
