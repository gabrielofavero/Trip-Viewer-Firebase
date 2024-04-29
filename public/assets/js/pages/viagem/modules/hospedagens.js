// ======= Transportation JS =======

// ======= LOADERS =======
function _loadStayModule() {
  let stayData = [];

  _loadStayLogoBoxes();
  for (let i = 0; i < FIRESTORE_DATA.hospedagens.hospedagem.length; i++) {
    const title = FIRESTORE_DATA.hospedagens.hospedagem[i];
    const endereco = FIRESTORE_DATA.hospedagens.endereco[i];

    const dataCheckIn = _convertFromFirestoreDate(FIRESTORE_DATA.hospedagens.datas[i].checkin);
    const dataCheckOut = _convertFromFirestoreDate(FIRESTORE_DATA.hospedagens.datas[i].checkout)

    const dataFormattedCheckIn = _jsDateToDate(dataCheckIn, "dd/mm/yyyy");
    const dataFormattedCheckOut = _jsDateToDate(dataCheckOut, "dd/mm/yyyy");

    const horarioCheckIn = _jsDateToTime(dataCheckIn);
    const horarioCheckOut = _jsDateToTime(dataCheckOut);


    const checkInOut = `Check-in ${dataFormattedCheckIn} às ${horarioCheckIn} e check-out ${dataFormattedCheckOut} às ${horarioCheckOut}`;

    const info = {
      title: title,
      text: `${endereco}. ${checkInOut}`
    }
    stayData.push(info)
  }
  _loadStayHTML(stayData);
}

function _loadStayLogoBoxes() {
  const logoBoxes = getID('logoBoxesStay');
  let innerHTML = "";
  let added = [];
  let group = [];

  const hospedagens = FIRESTORE_DATA.hospedagens.hospedagem;
  const links = FIRESTORE_DATA.hospedagens.links;
  const codes = FIRESTORE_DATA.hospedagens.codigos;

  for (let i = 0; i < hospedagens.length; i++) {
    let hospedagem = hospedagens[i];

    if (added.includes(hospedagem)) continue;

    added.push(hospedagem);

    let link = links[i];
    let img;
    let generic = "";

    if (codes[i]) {
      img = `assets/img/stays/${codes[i]}.png`
    } else {
      img = `assets/img/stays/generico.png`
      generic = " generic";
    }

    const text = `<a href="${link}" target="_blank"><img class="transpStayBox${generic}" src="${img}"></a>`

    if (!group.includes(text)) {
      group.push(text);
    }

    if (group.length == 2 || i == hospedagens.length - 1) {
      innerHTML += `<div class="logoBox">${group.join("")}</div>`;
      group = [];
    }
  }

  logoBoxes.innerHTML = innerHTML;

}

function _loadStayHTML(stayData) {
  const s1 = getID("s1");
  const s2 = getID("s2");

  const size1 = Math.ceil(stayData.length / 2);
  const size2 = stayData.length - size1;

  let innerHTML1 = "";
  let innerHTML2 = "";

  for (let i = 0; i < size1; i++) {
    innerHTML1 += `<li><i class="bi bi-chevron-right"></i><div><strong>${stayData[i].title}:</strong><span>${stayData[i].text}</span></div></li>`;
  }

  for (let i = 0; i < size2; i++) {
    innerHTML2 += `<li><i class="bi bi-chevron-right"></i><div><strong>${stayData[i + size1].title}:</strong><span>${stayData[i + size1].text}</span></div></li>`;
  }

  s1.innerHTML = innerHTML1;
  s2.innerHTML = innerHTML2;
}