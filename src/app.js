import express from 'express';
import {GitError} from './domain/git.js';

function buildRoutes(store){
    const router = express.Router();
// repositorios
    router.post('/repos', (req, res)=> {
        const repo = store.create(req.body?.name);
        res.status(201).location(`/repos/${repo.name}`).json({name: repo.name, head: repo.head});

    });

    router.get('/repos', (req,res)=> {
        res.json({repos: store.list() });
    });

    router.get('/repos/:name', (req,res)=> {
        const repo = store.get(req.params.name);
        res.json({
            name: repo.name,
            head: repo.head,
            branches: repo.listBranches(),
            totalCommits: repo.commits.size,
        });
    });

//commits
    router.post('/repos/:name/commits', (req, res) => {
        const commit = store.mutate(req.params.name, (repo) =>
        repo.commit(req.body?.message, req.body?.author)
  );
    res.status(201).json(commit);
});
    router.get('/repos/:name/log', (req, res)=>{
        const repo = store.get(req.params.name);
        res.json({branch: repo.head, commits: repo.log() });
    });

//branches
    router.get('/repos/:name/branches', (req, res) => {
    const repo = store.get(req.params.name);
    res.json({ head: repo.head, branches: repo.listBranches() });
  });

    router.post('/repos/:name/checkout', (req, res) => {
    const { branch, created } = store.mutate(req.params.name, (repo) =>
    repo.checkout(req.body?.branch, { create: req.body?.create === true })
  );
    res.status(created ? 201 : 200).json({ head: store.get(req.params.name).head, branch, created });
});
 
  return router;
}

const STATUS_POR_CODIGO = {
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `rota ${req.method} ${req.originalUrl} não existe` },
  });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof GitError) {
    const status = STATUS_POR_CODIGO[err.code] ?? 400;
    return res.status(status).json({ error: { code: err.code, message: err.message } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'body não é um JSON válido' },
    });
  }
    console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'erro interno' } });
}

export function createApp(store) {
  const app = express();
 
  app.use(express.json());
  app.use(buildRoutes(store));
  app.use(notFoundHandler);
  app.use(errorHandler); 
 
  return app;
}