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
    viagens: Referencia[];
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
        drive: string
    };
    imagem: {
        claro: string;
        escuro: string;
        ativo: boolean;
        altura: string
      };
    modulos: {
        hospedagens: boolean;
        programacao: boolean;
        passeios: boolean;
        resumo: boolean;
        voos: boolean
    };
    voos: Referencia;
    programacoes: Referencia;
    hospedagens: Referencia;
    cidades: Cidade[];
}

interface FirebaseTimestamp {
    _seconds: number;
    _nanoseconds: number;
}

interface Cidade {
    sigla: string;
    passeios: Referencia;
    nome: string;
    myMaps: string;
}

