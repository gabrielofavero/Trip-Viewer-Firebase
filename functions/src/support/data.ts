import * as admin from "firebase-admin";

export async function getDocument(stringPath: string) {
	const documentRef = admin.firestore().doc(stringPath);
	const documentSnapshot = await documentRef.get();

	if (!documentSnapshot.exists) {
		return null;
	}
	return documentSnapshot.data();
}

export async function setDocument(stringPath: string, data: any) {
	const documentRef = admin.firestore().doc(stringPath);
	await documentRef.set(data, { merge: true });
	return { success: true };
}

export async function deleteDocument(stringPath: string) {
	const documentRef = admin.firestore().doc(stringPath);
	await documentRef.delete();
	return { success: true };
}
