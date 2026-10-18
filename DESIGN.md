# despensa: sistema visual (17/10/2026)

Primeira versão do redesign, no padrão Notion. Testamos depois um padrão Apple (iOS 26) e um "caderno" com páginas do Notion; o Lucas preferiu esta, com polimento.

Referência: estrutura e gestos do iOS, limpeza do Notion. Um sistema só para os três módulos.

## Fundação
- Tokens em `src/index.css`: `--bg`, `--surface`, `--fill`, `--text`, `--text-2`, `--text-3`, `--line`, `--accent` (azul), `--good` (verde de concluir), `--danger`. Tema claro e escuro, automático, com escolha nas configurações.
- Fonte do sistema (SF Pro no iPhone e no Mac). Inter hospedada só como alternativa onde não há SF. Números com `tabular-nums`.
- Escala: título grande 34/700, corpo 17, apoio 15, legenda 13. Margem única `--gutter` (16px, 24px no tablet).
- Cor de ação: uma só. Verde só para concluir (pegar, pagar), vermelho só para apagar e atraso.

## Estrutura
- `Screen` (`ui.tsx`): barra de navegação sobre o conteúdo, título grande que vira título compacto ao rolar, com desfoque de material.
- Barra de abas inferior no celular (início, mercado, contas, desejos); vira barra lateral a partir de 900px. Some com o teclado aberto.
- Folhas (`Sheet`) para qualquer edição ou pergunta: editar item, conta ou desejo, finalizar compra, pasta, configurações. Arrastam para fechar.
- Listas planas com régua fina (`SwipeRow`) nos módulos; listas agrupadas (`Group`, `Row`) em início e configurações.

## Gestos (iguais nos três módulos)
- Direita: pegar, pagar, realizar. Esquerda: apagar, sempre com desfazer.
- Tocar no círculo conclui; tocar na linha abre a edição.
- Arrastar nunca vira toque no que estava embaixo do dedo.

## Entrada
Um campo só, fixo acima da barra de abas (`Composer`): "2 leite", "luz 180 dia 10", "abajur 320". O campo mostra o que entendeu. Edição usa a mesma gramática.

## Movimento
Molas curtas, resposta ao toque, sem decoração parada. Três momentos de feedback: adicionar, concluir e lista ou mês completo (`Done`). Reduzir movimento do sistema é respeitado.

## Acessibilidade
Foco visível, fundo inert sob folhas, Escape fecha, retorno do foco ao gatilho, `prefers-reduced-motion` e `prefers-reduced-transparency`.

## Ícone
Desenho do Lucas: um pote visto de frente, contorno preto `#161616` com cantos arredondados e um ponto verde `#3E9E68`, sobre papel `#FAFAF7`. A geometria fica em `src/lib/brand.ts` e em `scripts/icons.mjs` (tela de 560), e `node scripts/icons.mjs` gera tudo, do jeito que a Apple entrega:
- **iPhone e iPad** (`apple-touch-icon.png`, 180px): quadrado cheio e opaco; o sistema recorta os cantos.
- **Mac e computador** (`icon-192/512.png`): grade do macOS, corpo de 824 em 1024 no formato contínuo da Apple, com sombra suave.
- **Android** (`maskable-512.png`, `icon-1024.png`): quadrado cheio; o desenho cabe na zona segura.
- **Aba do navegador** (`favicon.svg`, 32 e 48px): ícone recortado, com o desenho um pouco maior para ler pequeno.
- **Safari** (`mask-icon.svg`): só o desenho, em uma cor.
Dentro do app, `Mark` (o desenho na cor do texto, com o ponto verde) aparece na tela de entrar, no carregamento e na barra lateral. `AppIcon` é o ícone recortado, para quando for preciso mostrar o ícone inteiro.
