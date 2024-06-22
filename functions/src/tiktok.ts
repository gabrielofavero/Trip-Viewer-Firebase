import { CallableRequest, onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as functions from 'firebase-functions';

interface UrlObject {
    [key: string]: string[];
}

export const convertTikTokLinks = onCall(async (request: CallableRequest<any>) => {
    const urlObject = request.data.urls as UrlObject;

    if (!urlObject || typeof urlObject !== 'object') {
        throw new functions.https.HttpsError('invalid-argument', 'Um objeto de URLs encurtados não foi fornecido ou o formato está incorreto.');
    }

    for (const key of Object.keys(urlObject)) {
        const urls = urlObject[key];
        if (!urls || !Array.isArray(urls)) {
            throw new functions.https.HttpsError('invalid-argument', 'Um array de URLs encurtados não foi fornecido ou o formato está incorreto.');
        }
        try {
            const originalUrls = await Promise.all(urls.map(url => _getTikTokLinkIfMobile(url)));
            urlObject[key] = originalUrls;
        } catch (error) {
            logger.error("Erro ao obter os URLs originais:", error);
            throw new functions.https.HttpsError('internal', 'Erro ao resolver os URLs encurtados.');
        }
    }

    return { urls: urlObject };
});

async function _getTikTokLinkIfMobile(shortUrl: string): Promise<string> {
    if (!shortUrl.startsWith('https://vm.tiktok.com/')) {
        return shortUrl;
    } else {
        try {
            const response = await fetch(shortUrl, {
                method: 'HEAD',
                redirect: 'follow'
            });
            return response.url;
        } catch (error) {
            logger.error('Erro ao obter o URL original:', error);
            throw error;
        }
    }
}