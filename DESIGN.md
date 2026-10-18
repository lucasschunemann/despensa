# despensa: sistema visual (17/10/2026, segunda versão)

Referência: como se a Apple tivesse feito o app, no iOS 26. Componentes em `src/components/ui.tsx`, estilos em `src/index.css`.

## Fundação
- **Cores do sistema** do iOS, claras e escuras: fundo agrupado `#F2F2F7` (preto puro no escuro), cartões brancos (`#1C1C1E`), rótulos em quatro níveis de cinza, régua fina de 0,5px. Azul do sistema é a cor de ação.
- **Cor por módulo**, como as categorias do Saúde: Mercado verde, Contas azul, Desejos rosa (`--tint`). Aparece no ícone do cartão, no círculo de concluir e no gesto de arrastar.
- **Tipografia do sistema**: SF Pro no iPhone e no Mac (Inter onde não houver). Título grande 34/41, corpo 17/22, apoio 15/20, legenda 13/18. Números grandes em SF Pro Rounded, como no Saúde.
- **Textos em frase normal** ("Mercado", "Salvar"), como a Apple escreve em português. Só a marca "despensa" fica em caixa baixa.
- **Vidro só na navegação** (barra de abas, campo flutuante, botões da barra, menus, folha de ação). Conteúdo nunca é de vidro.

## Estrutura
- `Screen`: título grande, data acima no Início, avatar na linha do título (como a App Store). Ao rolar, o título vai para a barra com a borda de rolagem desfocada do iOS 26.
- Barra de abas: cápsula de vidro flutuante com símbolos preenchidos e lente na aba atual. Tocar de novo na aba atual volta ao topo. A partir de 900px vira barra lateral, como no iPad.
- Campo de adicionar: cápsula de vidro acima da barra de abas (acessório). No Início, um menu escolhe o destino (Mercado, Contas, Desejos).
- Folhas flutuantes, com × à esquerda e ✓ azul à direita; o conteúdo vem em seções agrupadas.
- Escolhas com consequência (apagar ou salvar conta que se repete) usam a folha de ação do iOS, como o Calendário.

## Telas
- **Início**: cartões no estilo do Saúde, um por módulo, com o número grande e o que importa (atraso, dívida, próximo desejo).
- **Mercado**: como o Lembretes. Fundo branco, círculo à esquerda que enche na cor do módulo, linha "2 no carrinho · Finalizar compra · Mostrar".
- **Contas**: mês com setas, cartão de resumo, acerto como linha com botão, pastas em cápsulas, seções "A pagar" e "Pagas".
- **Desejos**: cartão do cofre, linha "Guardar por mês" editável como nos Ajustes, fila com foto, preço e previsão.
- **Configurações**: no formato do Ajustes, com ícones coloridos.
- **Apresentação**: tela única de boas-vindas, com três novidades e Continuar.

## Gestos (iguais nos três módulos)
Direita conclui (pegar, pagar, realizar). Esquerda mostra Apagar; arrastar até o fim apaga direto, como no Mail. Sempre com Desfazer. Arrastar nunca vira toque.

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
