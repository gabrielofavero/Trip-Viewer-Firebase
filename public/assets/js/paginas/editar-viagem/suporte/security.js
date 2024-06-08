async function generateHash(password) {
    // https://www.toptal.com/developers/bcrypt/
    try {
        const COST = 10;
        const url = 'https://www.toptal.com/developers/bcrypt/api/generate-hash.json';
    
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `password=${password}&cost=${COST}`
        });
    
        const data = await response.json();
    
        if (data.ok) {
            return data.hash;
        } else {
            console.error('Não foi possível gerar o hash da senha: ' + data.msg);
            _displayErro(data.msg);
        }
    } catch (error) {
        console.error('Erro ao gerar hash da senha: ' + error);
        _displayErro(error);
    }
}