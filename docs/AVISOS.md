# Avisos no celular (passo a passo)

Serve para o celular avisar, mesmo com o app fechado, quando a outra pessoa coloca item na
lista, paga uma conta ou põe um desejo novo.

**Isso é opcional.** Sem fazer nada aqui, o app continua funcionando igual: só não chega aviso.

São 3 partes. A 1 e a 2 são fáceis. A 3 é a única vez que você vai digitar comando no terminal.

---

## Parte 1: criar a tabela

Mesmo caminho das outras vezes (está no [guia do Supabase](SUPABASE.md)):

1. Abra https://github.com/lucasschunemann/despensa/blob/main/supabase/migrations/20260918000000_avisos.sql
2. Copie no botão dos **dois quadradinhos**.
3. Supabase → **SQL Editor** → **New query** → cole → **Run**.

---

## Parte 2: a chave pública na Vercel

Eu já gerei o par de chaves e coloquei a pública no seu `.env` aqui do computador.
As duas ficam guardadas no arquivo **`.vapid.local.json`**, na pasta do projeto. Esse arquivo
**não vai para o GitHub** (a chave privada é secreta, como a senha do banco).

Na Vercel:

1. **Settings** → **Environment Variables** → adicionar:
   - Name: `VITE_VAPID_PUBLIC_KEY`
   - Value: o valor de `publicKey` que está no `.vapid.local.json` (é o mesmo que está no seu `.env`)
2. **Deployments** → três pontinhos no mais recente → **Redeploy**.

---

## Parte 3: publicar a função que envia o aviso

O aviso precisa de alguém para despachar. Esse alguém é uma função que roda no Supabase.
Quatro comandos, uma vez só. No VS Code: menu **Terminal → New Terminal**, e digite um de cada vez.

**Antes:** pegue o `project-ref` do seu projeto. É aquele pedaço do endereço do Supabase:
`https://SEU-REF.supabase.co`. Também aparece em **Project Settings → General → Reference ID**.

```
npx supabase login
```
Abre o navegador para você autorizar. Volte ao terminal quando disser que deu certo.

```
npx supabase link --project-ref SEU-REF
```
Vai pedir a **senha do banco** (aquela que você guardou no Passo 1 do guia do Supabase).

```
npx supabase secrets set VAPID_PUBLIC_KEY=COLE_A_PUBLICA VAPID_PRIVATE_KEY=COLE_A_PRIVADA VAPID_SUBJECT=mailto:lucas.vhschunemann@gmail.com
```
As duas chaves estão no `.vapid.local.json`. Cole cada uma no lugar indicado, sem aspas.

```
npx supabase functions deploy notificar
```

✅ **Deu certo se:** aparece algo como "Deployed Function notificar".

---

## Parte 4: ligar no aparelho

No celular, **com o app aberto pela tela inicial** (não pelo Safari):

1. Toque no **menu** (canto superior direito).
2. Toque em **avisos no celular**.
3. O iPhone pergunta se pode avisar: diga que sim.
4. Deve ficar escrito **ligado**.

Cada aparelho liga o seu. Peça para a Bela fazer o mesmo no dela.

**Para testar:** peça para ela colocar um item na lista e trave seu telefone. O aviso chega em
até uns 12 segundos (o app junta o que aconteceu nesse meio tempo, para não mandar cinco avisos
seguidos quando alguém adiciona cinco coisas).

---

## Deu problema?

| O que aparece no menu | O que quer dizer | O que fazer |
|---|---|---|
| **instale na tela inicial** | Está aberto no Safari | No iPhone, aviso só funciona com o app adicionado à Tela de Início. Abra por lá |
| **bloqueado no aparelho** | Você negou a permissão alguma vez | Ajustes do iPhone → Notificações → despensa, e permita. No Mac: cadeado na barra de endereço |
| **não dá neste aparelho** | Navegador sem suporte | Use Safari (iPhone) ou Chrome (Android/computador) |
| A opção nem aparece | Falta a chave pública | Confira `VITE_VAPID_PUBLIC_KEY` no `.env` e na Vercel (Parte 2) |
| Liga, mas não chega nada | A função não foi publicada | Refaça a Parte 3 |

Se você perder o `.vapid.local.json`, dá para gerar outro par com `npx web-push generate-vapid-keys --json`,
mas aí os dois celulares precisam ligar os avisos de novo.

## O que ainda não existe

Aviso de **conta vencendo** ("a luz vence amanhã") precisa de alguém acordando sozinho todo dia
para conferir. Isso é um próximo passo; hoje os avisos só saem quando um de vocês faz alguma coisa.
