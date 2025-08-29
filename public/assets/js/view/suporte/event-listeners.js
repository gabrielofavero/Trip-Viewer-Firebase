import { closeToast } from "../../support/pages/messages";
import { on, onClick } from "../../support/pages/selectors.js";
import { calendarNext, calendarPrevious } from "../categorias/programacao/calendario.js";
import { closeModalCalendar } from "../categorias/programacao/inner-programacao.js";

export function loadViewEventListeners() {
    onClick('#previous', calendarPrevious);
    onClick('#next', calendarNext);
    onClick('#programacao-fechar', closeModalCalendar);
    onClick('.toast-close', closeToast);
}