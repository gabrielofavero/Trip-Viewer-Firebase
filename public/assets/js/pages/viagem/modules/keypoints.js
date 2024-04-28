// ======= Keypoints JS =======

function _loadKeypointsStandAlone() {
    const inicioDate = _convertFromFirestoreDate(FIRESTORE_DATA.inicio);
    const fimDate = _convertFromFirestoreDate(FIRESTORE_DATA.fim);
    const dias = Math.ceil((fimDate - inicioDate) / (1000 * 60 * 60 * 24));

    const inicio = `${inicioDate.getDate()}/${inicioDate.getMonth() + 1}`;
    const fim = `${fimDate.getDate()}/${fimDate.getMonth() + 1}`;
    const pessoas = FIRESTORE_DATA.quantidadePessoas;
    
    // Dado 1
    document.getElementById("dado1").innerHTML = `
  <i class="bx bxs-plane-take-off"></i>
  <span>${inicio}</span>
  <p>Ida</p>`;

    // Dado 2
    document.getElementById("dado2").innerHTML = `
  <i class="bx bxs-plane-land"></i>
  <span>${fim}</span>
  <p>Volta</p>`;

    // Dado 3
    document.getElementById("dado3").innerHTML = `
  <i class="bx bxs-sun"></i>
  <span>${dias}</span>
  <p>Dias de Viagem</p>`;

    // Dado 4
    document.getElementById("dado4").innerHTML = `
  <i class="bx bx-male"></i>
  <span>${pessoas}</span>
  <p>Pessoas Viajando</p>`
}