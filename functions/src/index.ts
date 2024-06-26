import * as tiktok from "./tiktok";
import * as gastos from "./gastos";
import * as admin from "./admin";

export const convertTikTokLinks = tiktok.convertTikTokLinks;
export const getGastos = gastos.getGastos;
export const scheduledFirestoreExport = admin.scheduledFirestoreExport;