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