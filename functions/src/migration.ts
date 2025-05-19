import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const migrateGastos = functions.https.onRequest(async (req, res) => {
    try {
        const gastosCollection = admin.firestore().collection('gastos');
        const snapshot = await gastosCollection.get();
        const batch = admin.firestore().batch();

        snapshot.forEach((doc) => {
            const data = doc.data();
            const docId = doc.id;
            if (docId === 'protected') return;
            const pin = data.pin;

            if (pin) {
                delete data.pin;
                batch.set(gastosCollection.doc('protected').collection(pin).doc(docId), data);
                batch.delete(gastosCollection.doc(docId));
            }
        });

        await batch.commit();
        res.status(200).send('Data migration completed successfully.');
    } catch (error) {
        console.error('Error migrating data:', error);
        res.status(500).send('Error migrating data.');
    }
});

export const migrateHospedagemImagem = functions.https.onRequest(async (req, res) => {
    try {
        const viagensCollection = admin.firestore().collection('viagens');
        const snapshot = await viagensCollection.get();
        const batch = admin.firestore().batch();

        snapshot.forEach((doc) => {
            const data = doc.data();
            const hospedagens = data.hospedagens;

            let changed = false;
            for (const hospedagem of hospedagens) {
                if (!hospedagem.imagem) continue;
                const link = hospedagem.imagem instanceof Object ? hospedagem.imagem.link : hospedagem.imagem;
                hospedagem.imagens = [{
                    descricao: '',
                    link
                }]
                delete hospedagem.imagem;
                changed = true;
                data.hospedagens = hospedagens;
            }

            if (changed) {
                batch.set(viagensCollection.doc(doc.id), data);
            }
        });

        await batch.commit();
        res.status(200).send('Data migration completed successfully.');
    } catch (error) {
        console.error('Error migrating data:', error);
        res.status(500).send('Error migrating data.');
    }
});

export const migrateTimezones = functions.https.onRequest(async (req, res) => {
    try {
        const viagensCollection = admin.firestore().collection('viagens');
        const snapshot = await viagensCollection.get();
        const batch = admin.firestore().batch();

        snapshot.forEach((doc) => {
            const data = doc.data();
            const timezoneOffset = data.timezoneOffset;

            // Inicio, fim, 
            const inicio = _convertFromFirestoreDate(data.inicio);
            inicio.setHours(0, 0, 0, 0); // Set to start of the day
            data.inicio = _dateToDateObject(inicio);

            const fim = _convertFromFirestoreDate(data.fim);
            fim.setHours(23, 59, 59, 999); // Set to end of the day
            data.fim = _dateToDateObject(fim);

            // hospedagens[x].datas.checkin, hospedagens.datas.checkout
            const hospedagens = [];
            for (const hospedagem of data.hospedagens) {
                const checkin = _convertFromFirestoreDate(hospedagem.datas.checkin, timezoneOffset);
                hospedagem.datas.checkin = _dateToDateObject(checkin);

                const checkout = _convertFromFirestoreDate(hospedagem.datas.checkout, timezoneOffset);
                hospedagem.datas.checkout = _dateToDateObject(checkout);

                hospedagens.push(hospedagem);
            }
            data.hospedagens = hospedagens;

            // programacoes[x].data
            const programacoes = [];
            for (const programacao of data.programacoes) {
                const dataProgramacao = _convertFromFirestoreDate(programacao.data);
                programacao.data = _dateToDateObject(dataProgramacao, false);
                programacoes.push(programacao);
            }
            data.programacoes = programacoes;

            // transportes.dados[x].datas.partida, transportes.dados[x].datas.chegada
            const dados = [];
            for (const dado of data.transportes.dados) {
                const partida = _convertFromFirestoreDate(dado.datas.partida, timezoneOffset);
                dado.datas.partida = _dateToDateObject(partida);

                const chegada = _convertFromFirestoreDate(dado.datas.chegada, timezoneOffset);
                dado.datas.chegada = _dateToDateObject(chegada);

                dados.push(dado);
            }
            data.transportes.dados = dados;

            delete data.timezoneOffset;
            batch.set(viagensCollection.doc(doc.id), data);
        });

        await batch.commit();
        res.status(200).send('Data migration completed successfully.');
    } catch (error) {
        console.error('Error migrating data:', error);
        res.status(500).send('Error migrating data.');
    }

    function _convertFromFirestoreDate(timestamp: { seconds: number; nanoseconds: number; _seconds: number; _nanoseconds: number; }, timezoneOffset=0) {
        let date;
        if (timestamp.seconds) {
            date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
        } else {
            date = new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
        }
        
        if (timezoneOffset) {
            const userOffset = new Date().getTimezoneOffset()
            date.setMinutes(date.getMinutes() + (userOffset - timezoneOffset));
        }
        return date;
    }

    function _dateToDateObject(date: Date, includeTime = true) {
        const dateObject = {
            day: date.getDate(),
            month: date.getMonth() + 1,
            year: date.getFullYear(),
            hour: 0,
            minute: 0
        };
        if (includeTime) {
            dateObject.hour = date.getHours();
            dateObject.minute = date.getMinutes();
        }
        return dateObject;
    }
});