# despensa: sistema visual (redesign de 17/10/2026)

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

## Marca
Provisória: wordmark "despensa" em caixa baixa e um "d" geométrico (`Mark` em `Avatar.tsx`, `public/brand/mark.svg`). Os ícones saem de `node scripts/icons.mjs`. Trocar o logo é editar esses dois arquivos.

## Acessibilidade
Foco visível, fundo inert sob folhas, Escape fecha, retorno do foco ao gatilho, `prefers-reduced-motion` e `prefers-reduced-transparency`.
