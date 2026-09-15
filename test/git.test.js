import { test } from 'node:test';
import assert from 'node:assert';
import { Repository, GitError } from '../src/domain/git.js';

// Testes de domínio: não sobem servidor, não tocam disco. Rodam em ms.

test('repositório novo começa na main sem commits', () => {
  const repo = new Repository('teste');
  assert.strictEqual(repo.head, 'main');
  assert.strictEqual(repo.log().length, 0);
});

test('commits encadeiam via parentId', () => {
  const repo = new Repository('teste');
  const a = repo.commit('primeiro');
  const b = repo.commit('segundo');

  assert.strictEqual(a.parentId, null);
  assert.strictEqual(b.parentId, a.id);
});

test('log vem do mais recente para o mais antigo', () => {
  const repo = new Repository('teste');
  repo.commit('a');
  repo.commit('b');
  repo.commit('c');

  assert.deepStrictEqual(
    repo.log().map((c) => c.message),
    ['c', 'b', 'a']
  );
});

test('commit sem mensagem é rejeitado', () => {
  const repo = new Repository('teste');
  assert.throws(() => repo.commit('   '), (err) => err instanceof GitError && err.code === 'INVALID_INPUT');
});

// Este é o teste que protege o bug da versão original: lá, o checkout
// comparava `.name` num objeto que só tinha `.nome`, então voltar para uma
// branch existente criava uma branch duplicada por cima.
test('checkout numa branch existente não cria duplicata', () => {
  const repo = new Repository('teste');
  repo.commit('na main');
  repo.checkout('feature', { create: true });
  repo.commit('na feature');

  repo.checkout('main');

  assert.strictEqual(repo.head, 'main');
  assert.strictEqual(repo.branches.size, 2);
});

test('branch nova herda o commit atual como ponto de partida', () => {
  const repo = new Repository('teste');
  const base = repo.commit('base');
  const { branch, created } = repo.checkout('feature', { create: true });

  assert.strictEqual(created, true);
  assert.strictEqual(branch.commitId, base.id);
});

test('commits em branches diferentes não se misturam', () => {
  const repo = new Repository('teste');
  repo.commit('base');
  repo.checkout('feature', { create: true });
  repo.commit('só na feature');
  repo.checkout('main');

  assert.deepStrictEqual(
    repo.log().map((c) => c.message),
    ['base']
  );
});

test('checkout em branch inexistente sem create dá erro', () => {
  const repo = new Repository('teste');
  assert.throws(() => repo.checkout('fantasma'), (err) => err.code === 'NOT_FOUND');
});

test('toJSON/fromJSON preservam o estado', () => {
  const repo = new Repository('teste');
  repo.commit('a');
  repo.checkout('feature', { create: true });
  repo.commit('b');

  const clone = Repository.fromJSON(JSON.parse(JSON.stringify(repo.toJSON())));

  assert.strictEqual(clone.head, 'feature');
  assert.deepStrictEqual(
    clone.log().map((c) => c.message),
    ['b', 'a']
  );
});

test('fromJSON preserva a data original do commit', () => {
  const repo = new Repository('teste');
  const original = repo.commit('a').createdAt;
  const clone = Repository.fromJSON(JSON.parse(JSON.stringify(repo.toJSON())));
  assert.strictEqual(clone.log()[0].createdAt, original);
});
