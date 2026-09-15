export class Commit {
    constructor(id, parentId, message, author,createdAt = new Date().toISOString()){
        this.id = id;
        this.parentId = parentId;
        this.message = message;
        this.author = author;
        this.createdAt = createdAt;}
        static fromJSON(data) {
    return new Commit(data.id, data.parentId, data.message, data.author, data.createdAt);
    }

}

export class Branch {
    constructor(name, commitId, createdAt = new Date().toISOString()){
        this.name = name;
        this.commitId = commitId;
        this.createdAt = createdAt;
    }
        static fromJSON(data) {
        return new Branch(data.name, data.commitId, data.createdAt);}
}

export class GitError extends Error{
    constructor(message, code){
        super(message);
        this.name ='Git Error';
        this.code = code;
    }
}

export class Repository {
    constructor(name){
        this.name = name;
        this.commits = new Map();
        this.branches = new Map();
        this.lastCommitId = -1;

        const main = new Branch ('main', null);
        this.branches.set(main.name, main);

        this.head = main.name;

    }
    currentBranch(){
        return this.branches.get(this.head);
    }

    commit(message, author = 'anonymous'){
        if (typeof message !== 'string' || message.trim() === '') {
        throw new GitError('message é obrigatório e não pode ser vazio', 'INVALID_INPUT');
    }

    const branch = this.currentBranch();
    const commit = new Commit(++this.lastCommitId, branch.commitId, message.trim(), author);

    this.commits.set(commit.id, commit);
    branch.commitId = commit.id; 

    return commit;
    }

      log() {
    const historico = [];
    let id = this.currentBranch().commitId;

    while (id !== null && id !== undefined) {
      const commit = this.commits.get(id);
      if (!commit) break; 
      historico.push(commit);
      id = commit.parentId;
    }

    return historico;
  }

    checkout(branchName, { create = false } = {}) {
    if (typeof branchName !== 'string' || branchName.trim() === '') {
      throw new GitError('branch é obrigatório', 'INVALID_INPUT');
    }

    const name = branchName.trim();
    const existing = this.branches.get(name);

    if (existing) {
      this.head = existing.name;
      return { branch: existing, created: false };
    }

    if (!create) {
      throw new GitError(`branch '${name}' não existe`, 'NOT_FOUND');
    }

    const novaBranch = new Branch(name, this.currentBranch().commitId);
    this.branches.set(name, novaBranch);
    this.head = novaBranch.name;

    return { branch: novaBranch, created: true };
  }

   listBranches() {
    return [...this.branches.values()].map((b) => ({
      name: b.name,
      commitId: b.commitId,
      isHead: b.name === this.head,
    }));
}
  toJSON() {
    return {
      name: this.name,
      head: this.head,
      lastCommitId: this.lastCommitId,
      commits: [...this.commits.values()],
      branches: [...this.branches.values()],
    };
  }
    static fromJSON(data) {
    const repo = new Repository(data.name);
    repo.head = data.head;
    repo.lastCommitId = data.lastCommitId;
    repo.commits = new Map(data.commits.map((c) => [c.id, Commit.fromJSON(c)]));
    repo.branches = new Map(data.branches.map((b) => [b.name, Branch.fromJSON(b)]));
    return repo;
  }
}

/*
Codigo antigo foi refatorado para um com creators mais bem definido
function Git (nome){
    this.nome = nome;
    this.lastCommitId = -1;
    this.branches = [];
    var master = new Branch("master", null);
    this.branches.push(master);

    this.HEAD = master;

}

var repo = new Git("meu-repo");


function Commit(id,parent,message){
    this.id = id;
    this.parent = parent;
    this.message = message;
    

}

function Branch (nome,commit){
    this.nome = nome;
    this.commit = commit;
}

Git.prototype.commit = function (message){
    var commit = new Commit(++this.lastCommitId,this.HEAD.commit,message);

    this.HEAD.commit = commit;

    return commit;
};

Git.prototype.log = function(){
    var commit = this.HEAD.commit,
    historico = [];
    
    while (commit){
        historico.push(commit);
        commit = commit.parent;
    }

    return historico;
}

Git.prototype.checkout = function (branchName){
    for (var i = this.branches.length; i--;){
        if (this.branches[i].nome === branchName){
            console.log("Trocando pra uma Branch existente: " + branchName);
            this.HEAD = this.branches[i];
            return this;
        }
    }
    var newBranch = new Branch (branchName, this.HEAD.commit);

    this.branches.push(newBranch);

    this.HEAD = newBranch;

    console.log("Trocou para uma Branch nova: " + branchName);
    return this;
};
*/