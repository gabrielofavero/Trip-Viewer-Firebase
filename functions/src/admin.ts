import * as functions from 'firebase-functions';
import { v1 as firestore } from '@google-cloud/firestore';
import { Storage } from "@google-cloud/storage";
import { onRequest } from 'firebase-functions/v1/https';
import { getDocument, setDocument, deleteDocument } from './suporte/dados';

const client = new firestore.FirestoreAdminClient();
const storage = new Storage();
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

// Only add the functions below to index.ts locally

export const firestoreImport = onRequest(async (req, res) => {
    let { backupDir } = req.body; // example: 2024-06-26T20:32:16_76660/

    try {
        if (!backupDir) {
            backupDir = await _getLatestBackupDir();
        }

        if (backupDir) {
            const databaseName = client.databasePath(projectId, '(default)');
            const inputUriPrefix = `${bucket}/${backupDir}`;

            const responses = await client.importDocuments({
                name: databaseName,
                inputUriPrefix: inputUriPrefix
            });

            const response = responses[0];

            if (!response['error']) {
                res.status(200).send(`Backup "${backupDir}" do Firestore importado com sucesso.`);
            } else {
                _launchError(response['error']);
            }
        } else {
            res.status(400).send('Parâmetro "backupDir" não informado.');
        }

    } catch (err) {
        _launchError(err);
    }

    async function _getLatestBackupDir() {
        const [files] = await storage.bucket(bucket).getFiles();
        const backups = Array.from(new Set(files
            .map(file => file.name.split('/')[0] + '/')
            .sort()
            .reverse()));

        if (backups.length > 0) {
            return backups[0];
        } else {
            return null;
        }
    }

    function _launchError(err: any) {
        const msg = err?.textPayload || err?.message || err;
        res.status(500).send(`Falha ao importar backup do Firestore: ${msg}`);
    }
});

export const migrateUserUID = onRequest(async (req, res) => {
    try {
        const users = req.body.users;
        for (const user of users) {
            await _migrateAdminData(user);
            await _migrateUserData(user);
            res.status(200).send(`Usuário ${user.from} migrado para ${user.to}.`);
        }
    } catch (err) {
        res.status(500).send(`Falha ao migrar usuário: ${err}`);
    }

    // Inner functions
    async function _migrateAdminData(user: any) {
        await _migrateInnerAdminData(user, 'admin')
        await _migrateInnerAdminData(user, 'permissoes')

        async function _migrateInnerAdminData(user: any, collection: string,) {
            const data = await getDocument(`admin/${collection}`);
            let changed = false;
            for (const key in data) {
                for (let i = 0; i < data[key].length; i++) {
                    if (data[key][i] === user.from) {
                        data[key][i] = user.to;
                        changed = true;
                    }
                }
            }
            if (changed) {
                await setDocument(`admin/${collection}`, data);
            }
        }
    }

    async function _migrateUserData(user: any) {
        const userData = await getDocument(`usuarios/${user.from}`);
        await setDocument(`usuarios/${user.to}`, userData);
        await deleteDocument(`usuarios/${user.from}`);

        await _migrateUserInnerData(user, userData, 'viagens', ['gastos']);
        await _migrateUserInnerData(user, userData, 'destinos');
        await _migrateUserInnerData(user, userData, 'listagens');

        async function _migrateUserInnerData(user: any, userData: any, collection: string, redirections?: string[]) {
            const documentIDs = userData[collection] || [];
            for (const documentID of documentIDs) {
                await _migrateUserCompartilhamentoData(collection, documentID);
                if (redirections) {
                    for (const redirection of redirections) {
                        await _migrateUserCompartilhamentoData(redirection, documentID);
                    }
                }
            }

            async function _migrateUserCompartilhamentoData(collection: string, documentID: string) {
                const document = await getDocument(`${collection}/${documentID}`);
                if (document) {
                    if (document?.compartilhamento?.dono === user.from) {
                        document.compartilhamento.dono = user.to;
                    }
                    if (document?.compartilhamento?.editores instanceof Array && document.compartilhamento.editores.includes(user.from)) {
                        document.compartilhamento.editores = document.compartilhamento.editores.map((editor: any) => editor === user.from ? user.to : editor);
                    }
                    await setDocument(`${collection}/${documentID}`, document);
                }
            }
        }

    }
});
