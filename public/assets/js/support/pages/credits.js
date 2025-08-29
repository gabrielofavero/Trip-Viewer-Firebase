import { translate } from "../../main/translate.js";
import { getJson, getPage } from "./data/data.js";
import { displayFullMessage, getDefaultProperties } from "./messages.js";
import { onClick } from "./selectors.js";

export function loadCreditsListeners() {
  onClick('.credits', openCredits)
}

async function openCredits() {
  const page = getPage();
  const credits = await getCredits();
  const content = [];

  for (const credit of credits) {
    if (credit.pages.includes(page)) {
      content.push(getCreditText(credit));
    }
  }

  const message = getDefaultProperties();
  message.title = translate('labels.credits');
  message.content = content.join('<br>');
  message.buttons = [];

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