function _loadResumo() {
  const dias = Math.ceil((FIM.date - INICIO.date) / (1000 * 60 * 60 * 24)) + 1;
  const pessoas = FIRESTORE_DATA.quantidadePessoas;

  // Dado 1
  getID("dado1").innerHTML = `<i class="bx bxs-plane-take-off"></i>
                                                <span>${INICIO.text}</span>
                                                <p>Ida</p>`;

  // Dado 2
  getID("dado2").innerHTML = `<i class="bx bxs-plane-land"></i>
                                                <span>${FIM.text}</span>
                                                <p>Volta</p>`;

  // Dado 3
  getID("dado3").innerHTML = `<i class="bx bxs-sun"></i>
                                                <span>${dias}</span>
                                                <p>Dias de Viagem</p>`;

  // Dado 4
  getID("dado4").innerHTML = `<i class="bx bx-male"></i>
                                                <span>${pessoas}</span>
                                                <p>Pessoas Viajando</p>`
}