import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { Store } from '../src/store.js';
import { createApp } from '../src/app.js';

/**
 * Testes de API: sobem o app de verdade numa porta aleatória (porta 0 = "SO,
 * escolhe uma livre") e usam o fetch nativo do Node. Sem supertest, sem mock.
 * O store é criado sem filePath, então nada é gravado em disco.
 */

let server;
let base;

before(async () => {
  // createApp devolve o app do Express; quem abre a porta é o teste.
  // Porta 0 = "SO, me dá qualquer porta livre" — dois testes rodando em
  // paralelo nunca brigam por porta.
  server = createApp(new Store(null)).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

const post = (url, body) =>
  fetch(base + url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

test('POST /repos cria e retorna 201', async () => {
  const res = await post('/repos', { name: 'meu-repo' });
  assert.strictEqual(res.status, 201);
  assert.deepStrictEqual(await res.json(), { name: 'meu-repo', head: 'main' });
});

test('POST /repos com nome duplicado retorna 409', async () => {
  const res = await post('/repos', { name: 'meu-repo' });
  assert.strictEqual(res.status, 409);
});

test('POST /repos com nome inválido retorna 400', async () => {
  const res = await post('/repos', { name: 'nome com espaço' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual((await res.json()).error.code, 'INVALID_INPUT');
});

test('repo inexistente retorna 404', async () => {
  const res = await fetch(`${base}/repos/nao-existe`);
  assert.strictEqual(res.status, 404);
});

test('fluxo completo: commit, branch, log', async () => {
  await post('/repos', { name: 'fluxo' });

  const c1 = await post('/repos/fluxo/commits', { message: 'primeiro commit' });
  assert.strictEqual(c1.status, 201);

  const ck = await post('/repos/fluxo/checkout', { branch: 'feature', create: true });
  assert.strictEqual(ck.status, 201);
  assert.strictEqual((await ck.json()).created, true);

  await post('/repos/fluxo/commits', { message: 'commit na feature' });

  const log = await (await fetch(`${base}/repos/fluxo/log`)).json();
  assert.strictEqual(log.branch, 'feature');
  assert.deepStrictEqual(
    log.commits.map((c) => c.message),
    ['commit na feature', 'primeiro commit']
  );

  // voltando para a main, a feature some do log
  const volta = await post('/repos/fluxo/checkout', { branch: 'main' });
  assert.strictEqual(volta.status, 200);
  assert.strictEqual((await volta.json()).created, false);

  const logMain = await (await fetch(`${base}/repos/fluxo/log`)).json();
  assert.deepStrictEqual(
    logMain.commits.map((c) => c.message),
    ['primeiro commit']
  );
});

test('commit sem message retorna 400', async () => {
  await post('/repos', { name: 'sem-msg' });
  const res = await post('/repos/sem-msg/commits', {});
  assert.strictEqual(res.status, 400);
});

test('rota inexistente retorna 404 em JSON', async () => {
  const res = await fetch(`${base}/nada`);
  assert.strictEqual(res.status, 404);
  assert.strictEqual((await res.json()).error.code, 'NOT_FOUND');
});

test('body com JSON quebrado retorna 400', async () => {
  const res = await fetch(`${base}/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{ isso nao e json',
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual((await res.json()).error.code, 'INVALID_JSON');
});
