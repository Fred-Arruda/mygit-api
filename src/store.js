import fs from 'node:fs';
import path from 'node:path';
import { Repository, GitError } from './domain/git.js';

const NOME_VALIDO = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export class Store{
    constructor(filePath = null) {
        this.filePath = filePath;
        this.repos = new Map();
        if (filePath) this.load();
  }

    load() {
        if (!fs.existsSync(this.filePath)) return;
        try {
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        for (const data of raw.repos ?? []) {
        this.repos.set(data.name, Repository.fromJSON(data));
      }
    } catch (err) {
      // Arquivo corrompido não pode impedir o servidor de subir.
      console.error(`[store] não consegui ler ${this.filePath}: ${err.message}`);
    }
  }
    save() {
        if (!this.filePath) return;
        const payload = { repos: [...this.repos.values()].map((r) => r.toJSON()) };

        const tmp = `${this.filePath}.tmp`;
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
        fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
        fs.renameSync(tmp, this.filePath);
  }

    create(name) {
    if (!NOME_VALIDO.test(name ?? '')) {
      throw new GitError(
        'name inválido: use letras, números, ponto, hífen ou underscore (até 64 caracteres)',
        'INVALID_INPUT'
      );
    }
    if (this.repos.has(name)) {
      throw new GitError(`repositório '${name}' já existe`, 'CONFLICT');
    }

    const repo = new Repository(name);
    this.repos.set(name, repo);
    this.save();
    return repo;
  }

    get(name) {
        const repo = this.repos.get(name);
        if (!repo) throw new GitError(`repositório '${name}' não encontrado`, 'NOT_FOUND');
        return repo;
  }

    mutate(name, fn) {
        const repo = this.get(name);
        const resultado = fn(repo);     
        this.save();
        return resultado;
}

  list() {
        return [...this.repos.values()].map((r) => ({
        name: r.name,
        head: r.head,
        branches: r.branches.size,
        commits: r.commits.size,
    }));
  }
}