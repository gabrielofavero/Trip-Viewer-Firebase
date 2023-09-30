// ======= Transportation JS =======

// ======= LOADERS =======
function _loadTransportationModule() {
  let transportation = {
    title: _getTransportationTitle(FIRESTORE_DATA.transportes.tipos.transporte),
    data: [],
  };

  for (let i = 1; i < FIRESTORE_DATA.transportes.trajetos.length; i++) {
    const title = FIRESTORE_DATA.transportes.trajetos[i];
    const periodo = _getPeriodo(FIRESTORE_DATA.transportes.datas[i]);
    const reservaCompanhia = _getReservaEmpresa(FIRESTORE_DATA.transportes.reservas[i], FIRESTORE_DATA.transportes.empresas[i]);
    const pontos = _getPontos(FIRESTORE_DATA.transportes.pontos[i]);

    const info = {
      title: title,
      text: periodo + reservaCompanhia + pontos
    }
    transportation.data.push(info)
  }

  _loadTransportationHTML(transportation);
}

function _loadTransportationHTML(transportation) {
  const title = transportation.title;
  const data = transportation.data;

  const tt = document.getElementById("transportationTitle");
  const ti1 = document.getElementById("transportationItems1");
  const ti2 = document.getElementById("transportationItems2");

  const size1 = Math.ceil(transportation.data.length / 2);
  const size2 = transportation.data.length - size1;

  let innerHTML1 = "";
  let innerHTML2 = "";

  for (let i = 0; i < size1; i++) {
    innerHTML1 += `<li><i class="bi bi-chevron-right"></i><strong>${data[i].title}:</strong><span>${data[i].text}</span></li>`;
  }

  for (let i = 0; i < size2; i++) {
    innerHTML2 += `<li><i class="bi bi-chevron-right"></i><strong>${data[i + size1].title}:</strong><span>${data[i + size1].text}</span></li>`;
  }

  tt.innerHTML = title;
  ti1.innerHTML = innerHTML1;
  ti2.innerHTML = innerHTML2;
}

// ======= GETTERS =======
function _getTransportationTitle(transportes) {
  let result = "";
  for (const transporte of transportes) {
    if (!result) {
      result = transporte;
    } else {
      if (result != transporte) {
        result = "Transporte";
        break;
      }
    }
  }
  return result;
}

function _getPeriodo(datas) {
  const inicio = datas.inicio;
  const fim = datas.fim;
  if (inicio && fim) {
    let inicioDate = _convertFirestoreDate(inicio);
    let fimDate = _convertFirestoreDate(fim);

    let inicioDia = inicioDate.getDate();
    let inicioMes = inicioDate.getMonth() + 1;
    let inicioAno = inicioDate.getFullYear();
    let inicioHorario = inicioDate.getHours() + ":" + inicioDate.getMinutes();

    let fimDia = fimDate.getDate();
    let fimMes = fimDate.getMonth() + 1;
    let fimAno = fimDate.getFullYear();
    let fimHorario = fimDate.getHours() + ":" + fimDate.getMinutes();

    if (inicioDia == fimDia && inicioMes == fimMes && inicioAno == fimAno) {
      return `${inicioDia}/${inicioMes}/${inicioAno}, de ${inicioHorario} até ${fimHorario}. `;
    }
  } else return "";
}

function _getReservaEmpresa(reserva, empresa) {
  if (reserva && empresa) {
    return `Reserva ${reserva} na empresa ${empresa}. `;
  } else if (reserva) {
    return `Reserva ${reserva}. `;
  } else if (empresa) {
    return `Empresa ${empresa}. `;
  } else return "";
}

function _getPontos(pontos) {
  const partida = pontos.partida;
  const chegada = pontos.chegada;

  if (partida && chegada) {
    return `Partida em ${partida} e chegada em ${chegada}.`;
  }
}