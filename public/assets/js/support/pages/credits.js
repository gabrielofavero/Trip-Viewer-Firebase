import { translate } from "../../main/translate.js";
import { getJson, getPage } from "./data/data.js";
import { getDefaultProperties, displayFullMessage } from "./mensagens.js";
import { on } from "../../main/app.js";

export function loadCreditsListeners() {
  on('click', '.credits', openCredits)
}

async function openCredits() {
  const page = getPage();
  const credits = await getCredits();

  for (const credit of credits) {
    if (credit.pages.includes(page)) {
      credits.push(getCreditText(credit));
    }
  }

  const message = getDefaultProperties();
  message.titulo = translate('labels.credits');
  message.conteudo = credits.join('<br>');
  message.botoes = [];

  displayFullMessage(message);
}

async function getCredits() {
  return await getJson("/assets/json/credits.json");
}

function getCreditText(credit) {
  const adapted = credit.adapted ? ` (${translate('labels.adapted')})` : ``;
  return `<strong>${translate(credit.label)}: </strong> 
          <span class="a"
            onclick="window.open('${label.href}', '_blank')">
            ${credit.author}}
          </span>${adapted}`;
}