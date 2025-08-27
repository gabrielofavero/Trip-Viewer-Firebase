import { closeToast } from "../../support/pages/messages";
import { on } from "../../support/pages/selectors.js";
import { calendarNext, calendarPrevious } from "../categorias/programacao/calendario.js";
import { closeModalCalendar } from "../categorias/programacao/inner-programacao.js";

export function loadViewEventListeners() {
    on('click', '#previous', calendarPrevious);
    on('click', '#next', calendarNext);
    on('click', '#programacao-fechar', closeModalCalendar);
    on('click', '.toast-close', closeToast);
}