# Autenticação e perfis

O app usa Supabase Auth com confirmação de e-mail e PKCE. A migration
`20260924000000_usuarios.sql` cria perfis, papéis (`member` e `admin`), recuperação da sala,
criação de novas casas e o bucket protegido de avatares.

## Migração de Lucas e Bela

Não apague nem encerre a sessão anônima antes de criar a conta. Na primeira abertura, use
**proteger minha casa** no mesmo iPhone/PWA. O Supabase converte a identidade anônima em uma
identidade por e-mail mantendo o mesmo `auth.uid()`, por isso a associação à sala e todo o
histórico continuam no lugar. Depois de confirmar o e-mail, o app pede a senha.

Se a conta já foi criada em outro aparelho, toque em **já tenho uma conta**. O código da sala
permanece no aparelho e a conta autenticada entra novamente nela.

## Google e Apple

Os botões já estão implementados e se ativam automaticamente quando o provedor estiver ligado.
No projeto atual, os dois aparecem como **em breve** porque ainda faltam as credenciais externas.

No Supabase Dashboard, abra **Authentication → Sign In / Providers**:

1. Para Google, crie um cliente OAuth Web no Google Cloud, copie Client ID e Client Secret e
   cadastre a callback mostrada pelo Supabase.
2. Para Apple, configure um Services ID e uma chave de Sign in with Apple no Apple Developer,
   copie os dados para o provedor e agende a renovação do secret antes de seis meses.
3. Em **Authentication → URL Configuration**, inclua a URL publicada do app nos Redirect URLs.
4. Em **Authentication → Settings**, mantenha confirmação de e-mail ativa e habilite manual
   identity linking para converter contas anônimas por OAuth sem trocar o `auth.uid()`.

O papel `admin` já existe, mas não pode ser alterado pelo cliente. Promova o usuário correto apenas
depois de ele concluir o cadastro, pelo SQL Editor usando o UUID confirmado da conta:

```sql
update public.profiles set role = 'admin' where id = 'UUID_CONFIRMADO_DO_LUCAS';
```

Essa escolha deliberada impede que qualquer pessoa se torne administradora alterando uma chamada
do navegador.
