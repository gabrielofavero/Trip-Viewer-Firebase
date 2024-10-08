// Conteúdo do Modal (HTML)
function _getInnerProgramacaoContent(j, k, turno, selects, isNew = false) {
    return `<div class="inner-programacao" id="inner-programacao-box">
                <div id="inner-programacao-tela-principal">
                    <div class="nice-form-group" style="display: ${Object.values(selects).some(item => item.ativo) ? 'block' : 'none'}">
                        <label style="margin-bottom: 0px;">Item Associado <span class="opcional">(Opcional)</span></label>
                        <button id="inner-programacao-item-associado" class="btn input-botao placeholder-text" onclick="_openInnerProgramacaoItem()" style="margin-top: 8px;"></button>
                    </div>

                    <div class="nice-form-group">
                        <label>Programação</label>
                        <input required class="nice-form-group" id="inner-programacao" type="text" placeholder="Ir para..." maxlength="50" autocomplete="off" />
                    </div>

                    <div class="side-by-side-box-fixed">
                        <div class="nice-form-group side-by-side-fixed">
                        <label>
                            Início<br>
                            <span class="opcional">(Opcional)</span>
                        </label>
                        <input class="flex-input-50-50" id="inner-programacao-inicio" type="time">
                    </div>

                    <div class="nice-form-group side-by-side-fixed">
                        <label>
                            Fim<br>
                            <span class="opcional">(Opcional)</span>
                        </label>
                        <input class="flex-input-50-50" id="inner-programacao-fim" type="time">
                    </div>
                    </div>

                    <div class="nice-form-group" style="display: ${isNew ? 'block' : 'none'}">
                        <label>Turno</label>
                        <select class="editar-select" id="inner-programacao-select-turno">
                            <option value="madrugada">Madrugada</option>
                            <option value="manha">Manhã</option>
                            <option value="tarde">Tarde</option>
                            <option value="noite">Noite</option>
                        </select>
                    </div>
                    
                    <div class="button-box-right" style="margin-top: 8px; margin-bottom: 8px; display: ${isNew ? 'none' : 'block'}">
                        <button onclick="_openInnerProgramacaoTroca()" class="btn btn-basic-secondary btn-format">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
                                <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"><path d="M18 31h20V5"/>
                                    <path d="M30 21H10v22m34-32l-6-6l-6 6"/><path d="m16 37l-6 6l-6-6"/>
                                </g>
                            </svg>
                        </button>
                        <button onclick="_deleteInnerProgramacao(${j}, ${k}, '${turno}')" class="btn btn-basic btn-format">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path fill="currentColor" fill-rule="evenodd" d="M8.106 2.553A1 1 0 0 1 9 2h6a1 1 0 0 1 .894.553L17.618 6H20a1 1 0 1 1 0 2h-1v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8H4a1 1 0 0 1 0-2h2.382l1.724-3.447ZM14.382 4l1 2H8.618l1-2h4.764ZM11 11a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Zm4 0a1 1 0 1 0-2 0v6a1 1 0 1 0 2 0v-6Z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div id="inner-programacao-item-selecionar" class="inner-programacao" style="display: none;">
                    <div class="nice-form-group" id="inner-programacao-item-selecionar-radio">
                        <label>Tipo</label>
                        <fieldset class="nice-form-group">
                            <div class="nice-form-group" id="inner-programacao-nenhum-radio-container">
                                <input type="radio" name="inner-programacao-item-radio" id="inner-programacao-item-nenhum-radio">
                                <label for="inner-programacao-item-nenhum-radio">Nenhum</label>
                            </div>

                            <div class="nice-form-group" id="inner-programacao-transporte-radio-container" style="display: ${selects.transporte.ativo ? 'block' : 'none'};">
                                <input type="radio" name="inner-programacao-item-radio" id="inner-programacao-item-transporte-radio">
                                <label for="inner-programacao-item-transporte-radio">Transporte</label>
                            </div>
                
                            <div class="nice-form-group" id="inner-programacao-hospedagens-radio-container" style="display: ${selects.hospedagens.ativo ? 'block' : 'none'};">
                                <input type="radio" name="inner-programacao-item-radio" id="inner-programacao-item-hospedagens-radio">
                                <label for="inner-programacao-item-hospedagens-radio">Hospedagem</label>
                            </div>
                
                            <div class="nice-form-group" id="inner-programacao-destinos-radio-container" style="display: ${selects.destinos.ativo ? 'block' : 'none'};">
                                <input type="radio" name="inner-programacao-item-radio" id="inner-programacao-item-destinos-radio">
                                <label id="inner-programacao-item-destinos-radio-label" for="inner-programacao-item-destinos-radio">Destino</label>
                            </div>
                        </fieldset>

                    </div>

                    <div class="nice-form-group" id="inner-programacao-item-transporte" style="display: none;">
                        <label>Transporte</label>
                        <select class="editar-select" id="inner-programacao-select-transporte">
                            <option value="">Selecione</option>
                            ${selects.transporte.options}
                        </select>
                    </div>

                <div class="nice-form-group" id="inner-programacao-item-hospedagens" style="display: none;">
                    <label>Hospedagem</label>
                    <select class="editar-select" id="inner-programacao-select-hospedagens">
                        <option value="">Selecione</option>
                        ${selects.hospedagens.options}
                    </select>
                </div>

                    <div id="inner-programacao-item-destinos" style="display: none;">
                        <div class="nice-form-group" id="inner-programacao-item-destinos-local">
                            <label>Local</label>
                            <select class="editar-select" id="inner-programacao-select-local">
                                ${selects.destinos.localOptions}
                                <option value="">Selecione</option>
                            </select>
                        </div>

                        <div class="nice-form-group">
                            <label>Categoria</label>
                            <select class="editar-select" id="inner-programacao-select-categoria">
                                <option value="">Selecione</option>
                            </select>
                        </div>

                        <div class="nice-form-group" id="inner-programacao-select-passeio-box" style="margin-top: 16px;">
                            <label>Passeio</label>
                            <select class="editar-select" id="inner-programacao-select-passeio">
                                <option value="">Selecione uma Categoria</option>
                            </select>
                        </div>            
                    </div>

                    <div class="nice-form-group" id="title-replacement-container" style="display: none">
                        <input type="checkbox" id="title-replacement-checkbox">
                        <label for="title-replacement" id="title-replacement-label"></label>
                    </div>

                    <div class="nice-form-group" id="time-replacement-container" style="display: none">
                        <input type="checkbox" id="time-replacement-checkbox">
                        <label for="time-replacement" id="time-replacement-label"></label>
                    </div>

                </div>

                <div id="inner-programacao-item-trocar" class="inner-programacao" style="display: none;">
                    <div class="nice-form-group">
                        <label>Data</label>
                        <select class="editar-select" id="inner-programacao-select-troca-data">
                            ${selects.datas}
                        </select>
                    </div>
                    <div class="nice-form-group">
                        <label>Turno</label>
                        <select class="editar-select" id="inner-programacao-select-troca-turno">
                            <option value="madrugada">Madrugada</option>
                            <option value="manha">Manhã</option>
                            <option value="tarde">Tarde</option>
                            <option value="noite">Noite</option>
                        </select>
                    </div>
                </div>
            </div>`;
}