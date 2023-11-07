// ======= Transportation JS =======

// ======= LOADERS =======
function _loadTransportationModule() {
  let transportation = {
    title: _getTransportationTitle(FIRESTORE_DATA.transportes.transportes),
    subtitle: _getTransportationSubtitle(FIRESTORE_DATA.transportes.reservas),
    data: [],
  };
  _loadTransportationLogoBoxes();
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

function _loadTransportationLogoBoxes() {
  const logoBoxes = document.getElementById('logoBoxes');
  let innerHTML = "";
  let added = [];
  let group = [];


  const empresas = FIRESTORE_DATA.transportes.empresas;
  const transportes = FIRESTORE_DATA.transportes.transportes;

  for (let i = 0; i < empresas.length; i++) {
    let empresa = empresas[i];

    if (added.includes(empresa)) continue;

    added.push(empresa);

    let link;
    let img;
    let generic = "";

    if (CONFIG.transportes[transportes[i]] && CONFIG.transportes[transportes[i]][empresas[i]]) {
      link = CONFIG.transportes[transportes[i]][empresa].link;
      img = `assets/img/transportation/${transportes[i]}/${empresas[i]}.png`
    } else {
      link = `https://www.google.com/search?q=${empresa.toLowerCase().replace(" ", "+")}`;
      img = `assets/img/transportation/generico/${transportes[i]}.png`
      generic = "generic";
    }

    const text = `<a href="${link}" target="_blank"><img class="transpStayBox" src="${img}"></a>`

    // checks if element already exists in group array
    if (!group.includes(text)) {
      group.push(text);
    }

    if (group.length == 2 || i == empresas.length - 1) {
      innerHTML += `<div class="logoBox">${group.join("")}</div>`;
      group = [];
    }
  }

  logoBoxes.innerHTML = innerHTML;

}

function _loadTransportationHTML(transportation) {
  const title = transportation.title;
  const subtitle = transportation.subtitle;
  const data = transportation.data;

  const tt = document.getElementById("transportationTitle");
  const ts = document.getElementById("transportationSubtitle");
  const ti1 = document.getElementById("transportationItems1");
  const ti2 = document.getElementById("transportationItems2");

  const size1 = Math.ceil(transportation.data.length / 2);
  const size2 = transportation.data.length - size1;

  let innerHTML1 = "";
  let innerHTML2 = "";

  for (let i = 0; i < size1; i++) {
    innerHTML1 += `<li><i class="bi bi-chevron-right"></i><div><strong>${data[i].title}:</strong><span>${data[i].text}</span></div></li>`;
  }

  for (let i = 0; i < size2; i++) {
    innerHTML2 += `<li><i class="bi bi-chevron-right"></i><div><strong>${data[i + size1].title}:</strong><span>${data[i + size1].text}</span></div></li>`;
  }

  tt.innerHTML = title;
  ts.innerHTML = subtitle;
  ti1.innerHTML = innerHTML1;
  ti2.innerHTML = innerHTML2;

  if (title != "Transporte") {
    const nav = document.getElementById("transportationNav");
    nav.innerHTML = nav.innerHTML.replace("Transporte", title).replace("bx-rocket", _getTitleIcon(title));
  }
}

// ======= GETTERS =======
function _getTransportationTitle(transportes) {
  const categorias = CONFIG.transportes.categorias;
  let result = "";
  for (const transporte of transportes) {
    const text = categorias[transporte];
    if (!result) {
      result = text;
    } else {
      if (result != text) {
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

  const empresaCaps = empresa ? empresa.charAt(0).toUpperCase() + empresa.slice(1) : "";

  if (reserva && empresa) {
    return `Reserva ${reserva} na empresa ${empresaCaps}. `;
  } else if (reserva) {
    return `Reserva ${reserva}. `;
  } else if (empresa) {
    return `Empresa ${empresaCaps}. `;
  } else return "";
}

function _getPontos(pontos) {
  const partida = pontos.partida;
  const chegada = pontos.chegada;

  if (partida && chegada) {
    return `Partida em ${partida} e chegada em ${chegada}.`;
  }
}

function _getTitleIcon(title) {
  if (!title) {
    title = document.getElementById('transportationNav').innerText;
  }
  switch (title) {
    case "Transporte":
      return "bx-rocket";
    case "Ônibus":
      return "bx-bus";
    case "Carro":
      return "bx-car";
    case "Voo":
      return "bxs-plane-alt";
  }
}

function _getTransportationSubtitle(reservas){
  const unique = [...new Set(reservas)];

  switch (unique.length) {
    case 0:
      return "";
    case 1:
      return "Reserva " + unique[0];
    default:
      return "Reservas " + unique.join(", ");
  }
}