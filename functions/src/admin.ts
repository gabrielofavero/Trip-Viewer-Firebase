import * as functions from 'firebase-functions';
import { v1 as firestore } from '@google-cloud/firestore';

const client = new firestore.FirestoreAdminClient();
const projectId = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || '';
const bucket = `gs://${projectId}-backups`;

export const scheduledFirestoreExport = functions.pubsub
    .schedule('0 0 1 * *') // First day of the month at midnight
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
        if (projectId != 'trip-viewer-prd') {
            console.warn('A operação de exportação de backup foi cancelada pois o projeto não é o de produção.');
        }
        const databaseName = client.databasePath(projectId, '(default)');
        try {
            const responses = await client.exportDocuments({
                name: databaseName,
                outputUriPrefix: bucket,
                // Leave collectionIds empty to export all collections
                // or set to a list of collection IDs to export,
                collectionIds: []
            });

            const response = responses[0];
            console.log(`Operação de exportação de backup: ${response['name']}`);
            return;
        } catch (err) {
            console.error(err);
            const msg = (err as any)?.textPayload;
            throw new Error(`Falha ao exportar backup do Firestore${msg ? ': ' + msg : '.'}`);
        }
    });

