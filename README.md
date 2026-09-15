# mygit-api

API REST que implementa o modelo de dados do Git — commits, branches e HEAD — com o histórico como grafo em memória. Node + Express.

Nasceu de um exercício de ~60 linhas que simulava o Git em JavaScript. Virou um backend com camadas separadas, tratamento centralizado de erros e 18 testes.

## Stack

Node 18+ · Express 5 · `node:test` · persistência em JSON

## Rodando

```bash
git clone https://github.com/Fred-Arruda/mygit-api
cd mygit-api
npm install
npm start                 # http://localhost:3000
npm run dev               # com --watch, reinicia a cada alteração
npm test                  # 17 testes
```

Os dados ficam em `data/repos.json`, criado na primeira escrita. `PORT` e `DATA_FILE` podem ser definidos por variável de ambiente.

## Modelo de dados

O Git é mais simples do que parece. Três ideias sustentam tudo:

- **Commit** — um nó de uma lista ligada. Guarda uma mensagem e o ID do commit anterior (`parentId`). O primeiro commit de tudo tem `parentId: null`.
- **Branch** — um nome com um ponteiro para um commit. Só isso. No Git real, `.git/refs/heads/main` é um arquivo de uma linha contendo um hash.
- **HEAD** — um ponteiro para a branch atual.

Commitar é: criar um commit cujo pai é o commit apontado pela branch atual, e mover o ponteiro da branch para ele. Ver o log é percorrer a lista ligada do HEAD até a raiz. Criar uma branch é criar um segundo ponteiro para o commit onde você está — por isso branch é barata no Git, e por isso duas branches compartilham o histórico até o ponto em que divergiram.

```
main ──────► C0 ◄── C1 ◄── C2
                     ▲
feature ─────────────┘        (feature saiu de C1)
```

## Rotas

| Método | Rota                      | Body                     | Resposta        |
|--------|---------------------------|--------------------------|-----------------|
| POST   | `/repos`                  | `{ name }`               | 201 / 400 / 409 |
| GET    | `/repos`                  | —                        | 200             |
| GET    | `/repos/:name`            | —                        | 200 / 404       |
| POST   | `/repos/:name/commits`    | `{ message, author? }`   | 201 / 400 / 404 |
| GET    | `/repos/:name/log`        | —                        | 200 / 404       |
| GET    | `/repos/:name/branches`   | —                        | 200 / 404       |
| POST   | `/repos/:name/checkout`   | `{ branch, create? }`    | 200 / 201 / 404 |

Erros vêm sempre no mesmo formato:

```json
{ "error": { "code": "NOT_FOUND", "message": "repositório 'x' não encontrado" } }
```

### Exemplos

```bash
curl -X POST localhost:3000/repos \
  -H 'content-type: application/json' -d '{"name":"meu-repo"}'

curl -X POST localhost:3000/repos/meu-repo/commits \
  -H 'content-type: application/json' -d '{"message":"primeiro commit","author":"fred"}'

# cria e entra numa branch nova (equivalente a git checkout -b)
curl -X POST localhost:3000/repos/meu-repo/checkout \
  -H 'content-type: application/json' -d '{"branch":"feature","create":true}'

curl -X POST localhost:3000/repos/meu-repo/commits \
  -H 'content-type: application/json' -d '{"message":"na feature"}'

curl localhost:3000/repos/meu-repo/log        # 2 commits

curl -X POST localhost:3000/repos/meu-repo/checkout \
  -H 'content-type: application/json' -d '{"branch":"main"}'

curl localhost:3000/repos/meu-repo/log        # 1 commit — a feature não aparece
```

## Organização

```
src/
  domain/git.js   regras do Git. Não sabe o que é HTTP.
  store.js        guarda os repositórios e persiste em JSON.
  app.js          rotas Express. Traduz HTTP <-> domínio, sem regra de Git.
  server.js       lê o ambiente (porta, arquivo) e sobe o servidor.
test/
  git.test.js     9 testes de domínio, rodam em milissegundos.
  api.test.js     8 testes de integração, sobem o servidor numa porta livre.
```

A regra que orienta tudo: **o domínio não conhece HTTP e o HTTP não conhece as regras**. `git.js` lança `GitError` com códigos próprios (`NOT_FOUND`, `CONFLICT`, `INVALID_INPUT`); uma tabela em `app.js` traduz esses códigos para status HTTP.

Isso não é decoração. A primeira versão deste projeto usava um roteador escrito à mão em cima do módulo `http`; a migração para Express reescreveu apenas o `app.js` — o domínio, o store e os 17 testes ficaram idênticos, inclusive os de integração, que não sabem qual camada web está por baixo.

## Decisões

**Por que o `parent` é um ID e não o objeto?** Guardar o objeto criaria referência circular e quebraria o `JSON.stringify`. Guardar o ID é o que o Git real faz — um commit armazena o hash do pai, não o pai inteiro — e mantém o grafo serializável.

**Por que o tratamento de erro é centralizado?** Nenhuma rota tem `try/catch`. O erro sobe até o middleware `errorHandler`, que traduz o código do domínio para o status HTTP num lugar só. Com sete rotas isso já evita repetição; com setenta, é a diferença entre um formato de erro consistente e uma loteria. O preço é que os handlers precisam ser síncronos: o Express 4 não captura rejeição de `async`, e um handler assíncrono que lança deixa a requisição pendurada até dar timeout, em vez de responder 500.

**Por que `createApp` não chama `listen`?** Separar a montagem da app da abertura da porta é o que permite os testes subirem a aplicação inteira na porta 0 — o SO escolhe uma livre — sem porta fixa e sem conflito quando vários rodam juntos.

**Por que persistência em JSON?** Regrava o arquivo inteiro a cada escrita e não aguenta duas instâncias simultâneas — é ingênuo de propósito, para manter o projeto sem banco. A escrita usa arquivo temporário + `rename`, que é atômico no sistema de arquivos, então uma queda no meio da gravação não deixa o JSON pela metade. Trocar por SQLite mexeria só em `store.js`.

**Por que os testes não usam biblioteca?** `node:test` vem no Node desde a v18, e `fetch` também. Os testes de API sobem o servidor de verdade e falam HTTP com ele — sem mock e sem supertest, uma dependência a menos para manter.

## Próximos passos

- `merge` de branches — achar o ancestral comum entre dois commits é o coração do algoritmo
- `diff` entre commits, o que exige guardar conteúdo de arquivo e não só mensagem
- conteúdo real: hash SHA-1 dos arquivos, blobs e trees como no `.git/objects`
- trocar a persistência em JSON por SQLite, mexendo só no `store.js`

## Licença

MIT
