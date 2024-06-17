import { Request, Response} from "firebase-functions";

const ALLOWED_ORIGINS = ['https://trip-viewer-tcc.web.app', 'https://trip-viewer-tcc.firebaseapp.com'];
const DEV_MODE = process.env.FUNCTIONS_EMULATOR === 'true';

export function handleCors(request: Request, response: Response) {
    const origin = request.headers.origin;

    if (!origin && !DEV_MODE) {
        response.status(400).send('Missing origin header');
        return false;
    }

    if ((origin && ALLOWED_ORIGINS.includes(origin)) || DEV_MODE) {
        response.set('Access-Control-Allow-Origin', origin);
    } else {
        response.set('Access-Control-Allow-Origin', 'null');
    }

    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type');

    if (request.method === 'OPTIONS') {
        response.status(204).send('');
        return false;
    }

    return true;
}