# despensa: caderno da casa (17/10/2026)

Caminho escolhido pelo Lucas depois de testar o padrão Apple e não gostar: o Notion levado a sério. Cada módulo é uma página, e o conteúdo é feito de blocos. Componentes em `src/components/ui.tsx`, estilos em `src/index.css`.

## Fundação
- **Paleta do Notion**: texto `#37352F`, cinzas quentes em transparência, régua `rgb(55 53 47 / .09)`, azul `#2383E2` como única cor de ação, barra lateral `#F7F7F5`. Tema claro e escuro (escuro `#191919`).
- **Etiquetas** nas nove cores das opções de seleção do Notion (cinza, marrom, laranja, amarelo, verde, azul, roxo, rosa, vermelho), com fundo claro e texto escuro.
- **Fonte do sistema** (a mesma pilha do Notion), Inter onde não houver. Título de página 32px (40px no computador), corpo 16px, propriedades 14px.
- **Textos em frase normal**, como o Notion escreve em português. Só "despensa" fica em caixa baixa.

## Estrutura
- `Page`: barra fina com o caminho ("Casa / 🛒 Mercado", tocar em Casa volta ao início), presença e avatar à direita. Abaixo, ícone grande (emoji da página, ou a marca no início), título e **propriedades** (rótulo cinza com ícone, valor à direita).
- Celular: barra de abas embaixo, simples. Computador: barra lateral com as páginas, como no Notion.
- Campo de adicionar fixo embaixo, sempre pronto. A linha "+ Novo" no fim de cada lista leva até ele.
- Itens abrem como **página numa folha**: título grande (o mesmo jeito de escrever: "2 pão integral", "Luz 213,50 dia 22"), propriedades e ações. Salvar fica no canto direito.
- Escolha com consequência (apagar ou mudar conta que se repete) usa uma confirmação pequena no centro.

## Páginas
- **Início**: data, saudação, o campo com um menu para escolher o destino, callouts quando há atraso ou dívida, e a lista das páginas com o resumo de cada uma.
- **🛒 Mercado**: lista de tarefas com a caixa quadrada do Notion e o emoji do produto no começo. Propriedades: falta pegar, no carrinho. O que foi pego vai para o bloco recolhível "No carrinho", com "Finalizar compra".
- **🧾 Contas**: propriedades do mês (mês, falta pagar, pagas, acerto), pastas como abas de visão de um banco de dados, e uma tabela agrupada em "A pagar" e "Pagas", com etiquetas (todo mês, divisão, pasta).
- **🎁 Desejos**: propriedades do cofre (na fila, poupança por mês, fila completa) e uma galeria de cartões com capa, preço, vontade e previsão.
- **Apresentação**: uma página de primeiros passos com três tarefas que dá para marcar.

## Gestos (iguais nos três módulos)
Direita conclui (pegar, pagar, realizar). Esquerda mostra Apagar; arrastar até o fim apaga direto. Sempre com Desfazer. Arrastar nunca vira toque.

## Ícone
Desenho do Lucas: um pote visto de frente, contorno preto `#161616` com cantos arredondados e um ponto verde `#3E9E68`, sobre papel `#FAFAF7`. A geometria fica em `src/lib/brand.ts` e em `scripts/icons.mjs` (tela de 560), e `node scripts/icons.mjs` gera tudo, do jeito que a Apple entrega:
- **iPhone e iPad** (`apple-touch-icon.png`, 180px): quadrado cheio e opaco; o sistema recorta os cantos.
- **Mac e computador** (`icon-192/512.png`): grade do macOS, corpo de 824 em 1024 no formato contínuo da Apple, com sombra suave.
- **Android** (`maskable-512.png`, `icon-1024.png`): quadrado cheio; o desenho cabe na zona segura.
- **Aba do navegador** (`favicon.svg`, 32 e 48px): ícone recortado, com o desenho um pouco maior para ler pequeno.
- **Safari** (`mask-icon.svg`): só o desenho, em uma cor.
Dentro do app: `Mark` (o desenho na cor do texto, ponto verde) e `AppIcon` (o ícone recortado, na tela de entrar).

## Acessibilidade
Foco visível e contido nas folhas, Escape fecha, foco volta ao gatilho. Respeita Reduzir Movimento, Reduzir Transparência (vidro sólido) e Aumentar Contraste.
