import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

const KEY_MAP_TRIP: Record<string, string> = {
  "transportes": "transportation",
  "compartilhamento": "share",
  "versao": "version",
  "hospedagens": "accommodation",
  "inicio": "start",
  "programacoes": "itinerary",
  "pessoas": "travelers",
  "destinos": "destination",
  "moeda": "currency",
  "imagem": "image",
  "modulos": "modules",
  "galeria": "gallery",
  "cores": "colors",
  "gastosPin": "expenses_pin",
  "titulo": "title",
  "fim": "end",
  "visualizacao": "view",
  "dados": "data",
  "editores": "editors",
  "ativo": "active",
  "dono": "owner",
  "ultimaAtualizacao": "last_update",
  "madrugada": "early_hours",
  "manha": "morning",
  "tarde": "afternoon",
  "data": "date",
  "noite": "evening",
  "destinosIDs": "destination_ids",
  "destinosID": "destination_id",
  "vacina": "vaccination",
  "claro": "light",
  "escuro": "dark",
  "programacao": "itinerary",
  "gastos": "expenses",
  "resumo": "highlights",
  "categorias": "categories",
  "descricoes": "descriptions",
  "titulos": "titles",
  "imagens": "images",
  "cafe": "breakfast",
  "datas": "dates",
  "visibilidade": "visibility",
  "checkin": "check_in",
  "checkout": "check_out",
  "descricao": "description",
  "endereco": "address",
  "reserva": "reservation",
  "nome": "title",
  "gastosDurante": "during_trip",
  "gastosPrevios": "pre_trip",
  "chegada": "arrival",
  "partida": "departure",
  "duracao": "duration",
  "empresa": "company",
  "idaVolta": "leg_view",
  "pontos": "location",
  "transporte": "transportation",
  "pessoa": "traveler",
  "categoria": "category",
  "local": "destination_id",
  "tipo": "type",
  "subtitulo": "subtitle",
  "exibirEmDestinos": "show_in_destination",
  "altura": "height",
  "caminho": "path"
};

const KEY_MAP_DESTINATION: Record<string, string> = {
  "lanches": "snacks",
  "lojas": "shopping",
  "restaurantes": "restaurants",
  "saidas": "nightlife",
  "turismo": "tourism",
  "titulo": "title",
  "moeda": "currency",
  "modulos": "modules",
  "mapa": "map",
  "compartilhamento": "share",
  "ativo": "active",
  "dono": "owner",
  "versao": "version",
  "ultimaAtualizacao": "last_update",
  "novo": "new",
  "nome": "title",
  "descricao": "description",
  "regiao": "region",
  "midia": "media",
  "nota": "priority",
  "valor": "price",
};

const KEY_MAP_EXPENSES: Record<string, string> = {
  "compartilhamento": "share",
  "ativo": "active",
  "dono": "owner",
  "editores": "editors",
  "gastosDurante": "during_trip",
  "gastosPrevios": "pre_trip",
  "moeda": "currency",
  "versao": "version",
  "ultimaAtualizacao": "last_update"
};

const KEY_MAP_USER: Record<string, string> = {
  "destinos": "destination",
  "foto": "profile_picture",
  "listagem": "listing",
  "nome": "username",
  "permissoes": "during_trip",
  "tamanhoUploadIrrestrito": "no_limit_upload_size",
  "viagens": "trip",
  "visibilidade": "visibility"
};

export const migrate = functions.https.onRequest(async (req, res) => {
  try {
    const results = [];
    results.push(await migrateCollection("viagens", "trip", KEY_MAP_TRIP));
    results.push(await migrateCollection("destinos", "destination", KEY_MAP_DESTINATION));
    results.push(await migrateCollection("gastos", "expenses", KEY_MAP_EXPENSES));
    results.push(await migrateCollection("listagens", "listing", KEY_MAP_TRIP));
    results.push(await migrateCollection("usuarios", "user", KEY_MAP_USER));

    const summary = {
      success: results.filter((r) => !r.error),
      failed: results.filter((r) => r.error),
    };

    console.log("Migration Summary:", summary);

    res.status(200).json({
      message: "Migration completed",
      summary,
    });
  } catch (error) {
    console.error("Migration process crashed:", error);
    res.status(500).send("Unexpected error running migrations.");
  }
});

function translateKeys(data: any, keyMap: Record<string, string>): any {
  if (Array.isArray(data)) {
    return data.map((item) => translateKeys(item, keyMap));
  } else if (data && typeof data === "object") {
    const newObj: any = {};
    Object.entries(data).forEach(([key, value]) => {
      const newKey = keyMap[key] || key;
      newObj[newKey] = translateKeys(value, keyMap);
    });
    return newObj;
  }
  return data;
}

async function migrateCollection(
  source: string,
  target: string,
  keyMap: Record<string, string>
): Promise<{ source: string; target: string; migrated: number; error?: string }> {
  try {
    const sourceCol = admin.firestore().collection(source);
    const targetCol = admin.firestore().collection(target);
    const snapshot = await sourceCol.get();

    if (snapshot.empty) {
      return { source, target, migrated: 0, error: "No documents found" };
    }

    const batch = admin.firestore().batch();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const migratedData = translateKeys(data, keyMap);
      const targetRef = targetCol.doc(doc.id);
      batch.set(targetRef, migratedData);
    });

    await batch.commit();
    return { source, target, migrated: snapshot.size };
  } catch (err: any) {
    return {
      source,
      target,
      migrated: 0,
      error: err.message || "Unknown error",
    };
  }
}
