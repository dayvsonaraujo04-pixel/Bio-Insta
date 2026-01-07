
export interface BioAuditResult {
  nome: { status: string; analise: string; sugestao: string };
  primeiraLinha: { status: string; analise: string; sugestao: string };
  segundaLinha: { status: string; analise: string; sugestao: string };
  terceiraLinha: { status: string; analise: string; sugestao: string };
  quartaLinha: { status: string; analise: string; sugestao: string };
  recomendacoesGerais: string[];
}

export interface Hook {
  text: string;
  category: string;
}

export interface ReelScript {
  id: number;
  titulo: string;
  visaoGeral: string;
  hook: string;
  conteudoPrincipal: string;
  cta: string;
}

export interface AuthorityPost {
  titulo: string;
  conteudo: string;
  objetivo: string;
}
