# Avisos no celular

Os avisos são enviados quando a outra pessoa adiciona um item, paga uma conta ou adiciona um desejo. Funcionam com o app fechado, depois que a alteração chega ao servidor. Alterações offline aguardam a sincronização.

## No iPhone

1. Abra o link da sala (`?sala=...`) no Safari.
2. Compartilhar → Adicionar à Tela de Início. Abra pelo ícone novo.
3. Menu → avisos no celular → **ativar avisos**. Aceite a solicitação do iPhone.
4. Quando mostrar **conectado**, toque em **enviar um teste**.
5. Confira a notificação; o modo Foco pode silenciá-la. Toque no aviso para abrir o app.

Requer iOS/iPadOS 16.4 ou posterior e HTTPS. A permissão só é solicitada após tocar no botão. Se estiver bloqueada, permita em Ajustes → Notificações → despensa, depois use **conferir novamente**.

Cada aparelho ativa os seus avisos. A área mostra exemplos de mercado, contas e desejos sem enviá-los. O botão de teste envia somente para o aparelho atual, depois de validar usuário e sala.

## Como funciona

- Triggers criam `push_deliveries` na mesma transação de `items`, `expenses` e `wishes`. Não dependem de o remetente manter o app aberto.
- Destinatários são assinaturas da mesma sala, excluindo a pessoa e o usuário remetentes.
- Mudanças em um intervalo de 12 segundos são agrupadas por aparelho, sala, remetente e módulo. Um upsert repetido não gera outro aviso de inclusão; pagamento já marcado também não.
- Supabase Cron verifica a fila a cada minuto. Em operação normal, a entrega começa em aproximadamente **12 a 72 segundos**, mais a latência do serviço de push. Foco, rede e sistema podem atrasar a exibição.
- O worker reserva cada entrega por dois minutos, usa backoff e tenta até seis vezes. Avisos com mais de 24h não são reenviados. Registros são limpos após sete dias.
- Uma falha de um aparelho não reenvia para aparelhos que já tiveram sucesso. HTTP 404/410 remove assinaturas expiradas.
- A entrega é *at least once*: uma interrupção entre o serviço aceitar o push e gravar sucesso pode repetir o envio; tags por módulo substituem o aviso na central quando o sistema suporta.
- O worker sempre mostra uma notificação e usa a Badging API quando disponível. O app limpa o badge ao voltar.
- Ao tocar, o módulo correto abre. O app aberto confirma a navegação sem recarregar; cold start usa fallback preservando o código da sala presente na URL.

## Configuração do servidor

No projeto original, a migration `20260922000000_push_duravel.sql`, os segredos, o Vault, o Cron e a função foram configurados em 17/09/2026. Não reaplique a migration nesse banco.

Para outro ambiente:

1. Aplique as migrations em ordem, incluindo `20260922000000_push_duravel.sql`.
2. Use o par de chaves existente de `.vapid.local.json`, que não entra no git. A pública precisa corresponder à `VITE_VAPID_PUBLIC_KEY` no ambiente do frontend.
3. Com Supabase CLI autenticada e projeto vinculado, execute:

```sh
python3 scripts/configure-push.py --subject mailto:seu-email@example.com
npx supabase functions deploy notificar --use-api
```

O script configura VAPID e cria um segredo do worker, armazenado tanto nas Edge Function Secrets quanto no Vault. Arquivos temporários têm permissão restrita e são removidos. Não imprime chaves.

`supabase/config.toml` desativa a verificação JWT legada do gateway; a função valida **todos** os pedidos: chamadas do app usam `Auth.getUser` e conferem usuário/sala/endpoint; o Cron usa segredo próprio. A chave de serviço e a VAPID privada nunca chegam ao frontend. Endpoints de push têm allowlist para evitar requisições a destinos arbitrários.

Publique o frontend após as mudanças. No manifesto, `start_url` vazio preserva a página de instalação, com o código da sala; `id` e `scope` são estáveis. Apps instalados anteriormente podem conservar a URL antiga, então o código também pode ser colado na tela de entrada.

## Verificação

- `npm run build`: tipos, testes unitários e build com service worker.
- `npm run test:e2e`: fluxos mobile, entrada rápida, busca, preview, teclado e movimento reduzido.
- `npx deno check --node-modules-dir=none supabase/functions/notificar/index.ts`: tipos do worker.
- `supabase/tests/push.sql`: executar **dentro de BEGIN/ROLLBACK**, em ambiente de teste; cobre agrupamento, reenvio idempotente, isolamento de destinatários e lease.
- Em aparelho físico: ativar em ambos, testar no atual, adicionar no outro, fechar imediatamente, esperar o Cron, abrir pela notificação. Testar também com Foco desativado.

O serviço responder com `enviados: 1` significa que o provedor aceitou o envio, não que a pessoa viu o aviso.

## Diagnóstico

| Estado | Ação |
|---|---|
| Instalar na tela inicial | Abra pelo ícone instalado, não pela aba do Safari |
| Reconectar aparelho | Regrava a assinatura na sala e pessoa atuais |
| Em preparação | Configure a chave pública e publique o frontend |
| Erro ao conectar | Confira rede, tabela, políticas e sessão |
| Teste não enviado | Confira função, segredos e logs do Supabase |
| Enviado, mas não apareceu | Confira permissões, Foco e conexão do iPhone |

`push_deliveries.last_error` guarda somente o status do erro, sem endpoint em logs. O job `despensa-push` deve estar ativo em `cron.job`. O Vault deve ter `despensa_push_url` e `despensa_push_secret`.

Lembretes agendados de vencimento ainda não fazem parte deste fluxo. Os avisos atuais refletem ações salvas no app.

Fontes: [WebKit: Web Push no iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [Supabase: agendar Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions), [W3C: manifesto](https://www.w3.org/TR/appmanifest/).
