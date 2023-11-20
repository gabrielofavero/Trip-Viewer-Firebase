export interface Referencia {
  _firestore: {
    projectId: string;
  };
  _path: {
    segments: string[];
  };
  _converter?: any;
}

export interface Usuario {
  Nome: string;
  viagens: any;
  passeios: any;
}

export interface Viagem {
  usuario: Referencia;
  titulo: string;
  inicio: FirebaseTimestamp;
  fim: FirebaseTimestamp;
  cores: {
    claro: string;
    escuro: string;
  };
  links: {
    attachments: string;
    pdf: string;
    maps: string;
    documents: string;
    ppt: string;
    vacina: string;
    sheet: string;
    drive: string;
  };
  imagem: {
    claro: string;
    escuro: string;
    ativo: boolean;
    altura: string;
  };
  modulos: {
    hospedagens: boolean;
    programacao: boolean;
    passeios: boolean;
    resumo: boolean;
    voos: boolean;
  };
  transportesRef: Referencia;
  transportes: any;
  programacoesRef: Referencia;
  programacoes: any;
  hospedagensRef: Referencia;
  hospedagens: any;
  cidades: Cidade[];
  compartilhamento: {
    ativo: boolean;
    editores: Referencia[];
  };
}

interface FirebaseTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

interface Cidade {
  sigla: string;
  passeiosRef: Referencia;
  nome: string;
  myMaps: string;
  passeios: any;
}

export interface Hospedagem {
  codigos: string[];
  endereco: string[];
  horarios: Horario[];
  hospedagem: string[];
  links: string[];
  viagem: any;
}

interface Horario {
  checkin: string;
  checkout: string;
}

export interface Passeios {
  lanches: Passeio[];
  lojas: Passeio[];
  restaurantes: Passeio[];
  saidas: Passeio[];
  turismo: Passeio[];
  titulo: string;
}

interface Passeio {
  descricao: string[];
  emoji: string[];
  hyperlink: Hyperlink[];
  nome: string[];
  nota: string[];
  novo: string[];
  plan: string[];
  regiao: string[];
  site: string[];
  valor: string[];
  video: string[];
}

interface Hyperlink {
  insta: string[];
  name: string[];
  video: string[];
}

export interface Programacao {
  programacao: {
    data: FirebaseTimestamp;
    manha: string[];
    tarde: string[];
    noite: string[];
    titulo: string;
  }[];
  viagem: any;
}

export interface Transporte {
  datas: {
    chegada: FirebaseTimestamp;
    partida: FirebaseTimestamp;
  }[];
  empresas: string[];
  idaVolta: string[];
  pontos: {
    chegada: string;
    partida: string;
  }[];
  reservas: string[];
  trajetos: string[];
  transportes: string[];
  viagem: any;
}
