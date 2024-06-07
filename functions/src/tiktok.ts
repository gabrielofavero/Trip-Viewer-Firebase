import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

export const convertTikTokLinks = onRequest(async (request, response) => {
    const urls = request.body.urls as string[];
    if (!urls || !Array.isArray(urls)) {
        response.status(400).json({ error: "Um array de URLs encurtados não foi fornecido ou o formato está incorreto." });
        return;
    }

    try {
        const originalUrls = await Promise.all(urls.map(url => _getTikTokLinkIfMobile(url)));
        response.json(originalUrls);
    } catch (error) {
        logger.error("Erro ao obter os URLs originais:", error);
        response.status(500).json({ error: "Erro ao resolver os URLs encurtados." });
    }
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
