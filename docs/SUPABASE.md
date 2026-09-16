# Guia do Supabase (para quem nunca usou)

Este guia leva uns **15 minutos** e você só faz **uma vez**. No final, a lista de vocês vai estar funcionando
e sincronizando entre o seu celular e o da Bela.

Não precisa saber programar. É só seguir na ordem, sem pular passo.

---

## Antes de começar: o que é o Supabase?

Pensa assim:

- O **app Despensa** é a tela que vocês veem no celular.
- O **Supabase** é um **caderno guardado na internet**, onde a lista fica escrita.

Quando você adiciona "leite" no seu celular, o app escreve "leite" nesse caderno. O celular da Bela está
sempre olhando o mesmo caderno, então o "leite" aparece lá na hora.

Neste guia você vai:

1. Criar o caderno (o **projeto** no Supabase).
2. Deixar a porta da frente aberta só para quem tem a chave (o **login invisível**).
3. Desenhar as páginas do caderno (as **tabelas**), copiando um texto pronto do GitHub.
4. Criar a sala de vocês e anotar o **código da sala**.
5. Pegar o **endereço** e a **chave** do caderno e entregar para o app.

---

## Passo 1: criar a conta e o projeto

1. Entre em **https://supabase.com** e clique em **Start your project** (ou **Sign in**).
2. Escolha **Continue with GitHub**. Assim você não precisa criar outra senha.
3. Se ele pedir para criar uma **Organization** (organização), coloque qualquer nome, por exemplo `Casa`,
   e escolha o plano **Free** (grátis).
4. Clique em **New project** (novo projeto) e preencha:
   - **Project name** (nome do projeto): `despensa`
   - **Database Password** (senha do banco): clique em **Generate a password** (gerar senha) e
     **guarde essa senha no seu gerenciador de senhas**. O app não vai usar essa senha, mas é bom ter guardada.
   - **Region** (região): escolha **South America (São Paulo)**. É o mais perto de vocês, então fica mais rápido.
5. Clique em **Create new project** (criar projeto).
6. **Espere 1 ou 2 minutos.** Aparece uma tela dizendo que o projeto está sendo preparado. É normal.
   Quando terminar, você cai na página inicial do projeto.

✅ **Deu certo se:** você está vendo uma página com o nome `despensa` no topo e um menu com ícones na
lateral esquerda.

---

## Passo 2: ligar o "login invisível"

O Despensa não tem tela de login. Por baixo dos panos, cada celular recebe uma identidade anônima
(como um crachá sem nome), e o código da sala diz quais crachás podem ver a lista. Para isso funcionar,
você precisa ligar uma opção.

1. No menu da esquerda, clique em **Authentication** (ícone de pessoa/cadeado).
2. Clique em **Sign In / Providers** (em algumas versões aparece só **Providers**).
3. Procure a opção **Allow anonymous sign-ins** (permitir entradas anônimas) e **ligue** a chavinha.
4. Se aparecer um botão **Save** (salvar), clique nele.

✅ **Deu certo se:** a chavinha de **Allow anonymous sign-ins** está ligada (colorida).

> Isso não deixa qualquer um ver a lista. Um estranho até consegue um crachá, mas sem o código da
> sala o caderno aparece **vazio** para ele. Isso foi testado.

---

## Passo 3: criar as tabelas (copiando do GitHub)

Tabelas são as "páginas" do caderno: uma para os itens, uma para as salas, uma para o histórico.
Você não precisa entender o texto que vai colar. Ele já está pronto e testado.

### 3a. Copiar o texto do GitHub

1. Abra este link:
   **https://github.com/lucasschunemann/despensa/blob/main/supabase/migrations/20260915000000_init.sql**
2. Em cima do texto, no canto direito, tem um botão com **dois quadradinhos** (dica: "Copy raw file").
   Clique nele. Pronto, o texto inteiro foi copiado.

### 3b. Colar e rodar no Supabase

1. Volte para o Supabase. No menu da esquerda, clique em **SQL Editor** (ícone parecido com `>_`).
2. Clique em **New query** (nova consulta) ou no **+**. Abre uma área em branco para escrever.
3. Clique nessa área e cole (**Cmd + V**).
4. Clique no botão **Run** (rodar), no canto de baixo à direita. Ou aperte **Cmd + Enter**.
5. Se aparecer um aviso perguntando se você tem certeza, confirme (algo como **Run this query**).

✅ **Deu certo se:** embaixo aparece **Success. No rows returned** (sucesso, nenhuma linha retornada).
"Nenhuma linha" é normal aqui: esse texto só cria as páginas, ainda não tem nada escrito nelas.

**Para conferir:** no menu da esquerda, clique em **Table Editor**. Tem que aparecer
`items`, `list_archives`, `room_members` e `rooms`.

❌ **Se aparecer um erro dizendo `already exists`** (já existe): você já tinha rodado antes. Está tudo certo,
não precisa fazer de novo.

---

## Passo 4: criar a sala de vocês

1. Ainda no **SQL Editor**, clique em **New query** de novo (uma área em branco nova).
2. Cole exatamente esta linha:
   ```sql
   insert into public.rooms default values returning code;
   ```
3. Clique em **Run**.
4. Embaixo aparece uma tabelinha com uma coluna `code` e um texto comprido, tipo
   `3f9a1c7e2b8d4e6fa0c1b2d3e4f5a6b7`.
5. **Copie esse código e guarde** (no gerenciador de senhas ou nas notas). Esse é o **código da sala**.

⚠️ **Rode essa linha só uma vez.** Cada vez que roda, cria uma sala nova. Se criar sem querer, não tem problema:
use sempre o mesmo código e ignore os outros.

🔒 **Esse código é a chave da casa.** Quem tiver o código vê e mexe na lista. Mande só para a Bela e
**nunca coloque no GitHub** (o repositório é público).

---

## Passo 5: pegar o endereço e a chave, e entregar para o app

O app precisa de duas informações para achar o caderno:

- **Project URL**: o endereço, tipo `https://abcdefgh.supabase.co`
- **Publishable key**: a chave pública, começa com `sb_publishable_...`

### 5a. Achar as duas informações

1. No topo da página do projeto, clique no botão **Connect** (conectar).
2. Na janela que abre, procure a parte de **App Frameworks** (ou similar) e escolha **React** (se pedir uma
   ferramenta, escolha **Vite**).
3. Vão aparecer duas linhas parecidas com isto:
   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
   ```
   Deixe essa janela aberta.

> **Não achou o Connect?** Vá em **Project Settings** (engrenagem, lá embaixo no menu) → **API Keys**
> para a chave, e **Data API** para a URL.

⚠️ **Use a `publishable`, nunca a `secret`.** Se aparecer uma chave que começa com `sb_secret_` ou que diz
`service_role`, **não use**. Essa abre o caderno inteiro sem regra nenhuma. A `publishable` pode ficar no
app sem problema, ela foi feita para isso.

### 5b. Criar o arquivo `.env` no VS Code

O `.env` é um arquivinho de configuração que fica **só no seu computador** (ele não vai para o GitHub).

1. No VS Code, na lista de arquivos à esquerda, clique com o botão direito num **espaço vazio**
   (abaixo dos arquivos) e escolha **New File...** (novo arquivo).
2. Digite o nome exatamente **`.env`** (com o ponto na frente, sem mais nada) e aperte **Enter**.
3. O arquivo abre vazio. Cole nele as duas linhas que o Supabase mostrou na janela do
   **Connect**. Tem que ficar assim (com os seus valores):
   ```
   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
   ```
   Se o Supabase mostrou mais linhas além dessas duas, pode deixar só essas duas.
4. Salve (**Cmd + S**).

> No Finder do Mac, arquivos que começam com ponto ficam **escondidos**. Por isso é mais fácil fazer pelo VS Code.

---

## Passo 6: testar

1. No VS Code, abra o terminal: menu **Terminal → New Terminal**.
2. Digite e aperte Enter (só na primeira vez):
   ```
   npm install
   ```
3. Depois digite e aperte Enter:
   ```
   npm run dev
   ```
4. Aparecem alguns endereços. Abra no navegador o endereço `http://localhost:5173/?sala=` com o
   **código da sala** colado no final. Exemplo:
   `http://localhost:5173/?sala=3f9a1c7e2b8d4e6fa0c1b2d3e4f5a6b7`
5. Escolha **Lucas**, adicione um item.
6. Abra o **mesmo endereço** numa **janela anônima** do navegador (Cmd + Shift + N no Chrome), escolha **Bela**
   e veja o item aparecer. Marque como pegado numa janela e veja riscar na outra.

✅ **Deu certo se:** o que você faz numa janela aparece sozinho na outra, e a bolinha no canto de cima
fica **verde**.

**Para abrir no celular** (com o computador ligado e os dois na mesma rede Wi-Fi): o terminal mostra uma
linha **Network**, tipo `http://192.168.0.12:5173/`. Use esse endereço no celular, com o `?sala=...` no final.
Para usar no mercado, fora de casa, o app precisa ser publicado na internet. Isso é um próximo passo.

---

---

## Quando eu avisar que tem banco novo

Às vezes uma funcionalidade nova precisa de tabelas novas. Aí você repete o Passo 3, só que com o
arquivo novo. **É sempre o mesmo caminho:**

1. Abra a pasta das migrations no GitHub:
   **https://github.com/lucasschunemann/despensa/tree/main/supabase/migrations**
2. Clique no arquivo que eu te indicar (é o de nome mais recente).
3. Copie o conteúdo pelo botão de **dois quadradinhos**.
4. No Supabase: **SQL Editor** → **New query** → cole → **Run**.
5. Esperado: **Success. No rows returned**.

Já rodou e não tem certeza? Rodar de novo só devolve `already exists`, que quer dizer "já estava
feito". Não estraga nada.

### O que já existe para rodar

| Arquivo | Para quê | Sem ele |
|---|---|---|
| `20260915000000_init.sql` | lista de mercado | o app não abre |
| `20260916000000_financeiro.sql` | contas do mês | a aba contas dá erro |
| `20260917000000_desejos.sql` | lista de desejos e fotos | a aba desejos dá erro |
| `20260918000000_avisos.sql` | avisos no celular | o menu não liga os avisos ([guia](AVISOS.md)) |
| `20260919000000_fotos.sql` | conserta o envio de foto dos desejos | a foto dá "row-level security policy" |
| `20260920000000_apagar_recorrente.sql` | apagar conta "todo mês" deste mês em diante | a opção "em diante" dá erro |

### Módulo financeiro (arquivo `20260916000000_financeiro.sql`)

Esse é o das contas do mês. Sem ele, a aba **contas do mês** abre com erro vermelho na tela.
Depois de rodar, ele cria:

| Tabela | Para quê |
|---|---|
| `expenses` | as contas de cada mês |
| `recurrences` | as contas marcadas como "todo mês" |
| `recurrence_runs` | controle para a conta do mês não ser lançada duas vezes |

Para ver as contas cruas depois: **Table Editor** → `expenses`.

---

## Deu problema? Procure aqui

| O que aparece | O que quer dizer | O que fazer |
|---|---|---|
| "Supabase não configurado" | O app não achou o `.env` | Confira se o arquivo se chama exatamente `.env` (Passo 5b). Depois, no terminal, aperte **Ctrl + C** e rode `npm run dev` de novo |
| "Não deu para entrar: Anonymous sign-ins are disabled" | O login invisível está desligado | Refaça o Passo 2 |
| "Não deu para entrar: sala não encontrada" | O código da sala está errado | Confira se copiou o código inteiro, sem espaço (Passo 4) |
| "Não deu para entrar: Could not find the function..." ou "relation does not exist" | As tabelas não foram criadas | Refaça o Passo 3 |
| "Invalid API key" | A chave está errada | Confira se colou a `publishable` inteira (Passo 5) |
| Bolinha **vermelha** ou item só aparece depois de recarregar | A sincronização ao vivo caiu | Recarregue a página. Se continuar, confira sua internet |
| "Request rate limit reached" | Muitas entradas novas da mesma internet em 1 hora (limite de 30) | Espere uma hora. Acontece mais quando se testa muito com janela anônima |
| "Could not find the function public.ensure_month" ou erro vermelho na aba contas | O banco do módulo financeiro não foi criado | Rode a migration `20260916000000_financeiro.sql` (seção acima) |
| Erro vermelho na aba desejos | Falta a migration dos desejos | Rode `20260917000000_desejos.sql` |
| Ao pôr foto: "new row violates row-level security policy" | As regras do balde de fotos não pegaram | Rode `20260919000000_fotos.sql`. Pode rodar mais de uma vez sem problema |
| No painel, o projeto aparece como **Paused** (pausado) | No plano grátis, projeto sem uso por uma semana é pausado | Clique em **Restore project** (restaurar) e espere uns minutos. Nada é perdido |

---

## O que é segredo e o que não é

| Coisa | Pode ir para o GitHub? | Onde guardar |
|---|---|---|
| Código da sala | ❌ Não | Gerenciador de senhas. Mande só para a Bela |
| Senha do banco (Passo 1) | ❌ Não | Gerenciador de senhas |
| Chave `secret` / `service_role` | ❌ Não, e nem no `.env` do app | Não precisa usar |
| Chave `publishable` | ✅ Pode (é pública), mas fica no `.env` | `.env` |
| Project URL | ✅ Pode | `.env` |
| Arquivo `.env` | Ele já está configurado para **nunca** subir para o GitHub | Só no computador |

---

## Onde ver as coisas depois

- **Ver a lista "crua"**: **Table Editor** → `items`.
- **Recuperar uma lista antiga** (as 3 últimas compras finalizadas): **Table Editor** → `list_archives`.
  Cada linha é uma compra. A coluna `items` tem todos os itens daquela lista.
