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
