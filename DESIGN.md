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

## Marca
Provisória: "d" geométrico (`Mark` em `Avatar.tsx`, `public/brand/mark.svg`). Os ícones saem de `node scripts/icons.mjs`.

## Acessibilidade
Foco visível e contido nas folhas, Escape fecha, foco volta ao gatilho. Respeita Reduzir Movimento, Reduzir Transparência (vidro sólido) e Aumentar Contraste.
