const TRANSPORTATION_JSON = _getJSON('assets/json/modules/information/transportation.json');

function _loadTransportationModule() {
    document.getElementById("sobre2").innerHTML = "<strong>" + TRANSPORTATION_JSON["defaultTransportation"]["ida"]["text"] + " Ida:</strong><span></span>";
    document.getElementById("sobre4").innerHTML = "<strong>" + TRANSPORTATION_JSON["defaultTransportation"]["volta"]["text"] + " Volta:</strong><span></span>";
}

function _loadTransportationFromData() {
    let mode = {
        current: "ida",
        ida: {
            mode: "ida",
            found: false,
            index: 0,
            max: _getCountForArrayValue(FIRESTORE_DATA.voos.tipos, "ida"),
            result: {
                text: TRANSPORTATION_JSON["defaultTransportation"]["default"]["text"],
                icon: TRANSPORTATION_JSON["defaultTransportation"]["default"]["icon"]
            },
            multipleTexts: false
        },
        volta: {
            mode: "volta",
            found: false,
            index: 0,
            max: _getCountForArrayValue(FIRESTORE_DATA.voos.tipos, "volta"),
            result: {
                text: TRANSPORTATION_JSON["defaultTransportation"]["default"]["text"],
                icon: TRANSPORTATION_JSON["defaultTransportation"]["default"]["icon"]
            },
            multipleTexts: false
        }
    }

    for (let i = 0; i < SHEET_DATA.length; i++) { // Procura em cada linha do SHEET_DATA
        let currentMode = mode["current"];
        if (SHEET_DATA[i][5] == "Ida/Volta" && currentMode) {
            let search = _formatTxt(SHEET_DATA[i][3]) + " " + _formatTxt(SHEET_DATA[i][4]);
            for (let j = 0; j < TRANSPORTATION_JSON["texts"].length; j++) {
                let currentText = TRANSPORTATION_JSON["texts"][j];
                let currentIcon = TRANSPORTATION_JSON["icons"][j];

                let searchedtext = _formatTxt(TRANSPORTATION_JSON["texts"][j]);
                let altText = TRANSPORTATION_JSON["altTexts"][searchedtext];
                let foundInAltText = false;

                if (altText) {
                    for (let k = 0; k < altText.length; k++) {
                        if (search.includes(_formatTxt(altText[k]))) {
                            foundInAltText = true;
                            break;
                        }
                    }
                }
                if (search.includes(searchedtext) || foundInAltText) { // Se encontrado
                    if (mode[currentMode]["index"] > 0 && mode[currentMode]["text"] != currentText) { // Caso já tenha encontrado um texto diferente anteriormente
                        mode[currentMode]["multipleTexts"] = true;
                    } else {
                        mode[currentMode]["result"]["text"] = currentText;
                        mode[currentMode]["result"]["icon"] = currentIcon;
                    }
                }
                mode[currentMode]["index"]++;
                if (mode[currentMode]["index"] == mode[currentMode]["max"] || mode[currentMode]["multipleTexts"]) { // Se já encontrou todos os textos ou se encontrou textos diferentes 
                    mode[currentMode]["found"] = true;
                    mode["current"] = currentMode == "ida" ? "volta" : "";
                    break;
                }
            }
        }
    }

    if (!mode["ida"]["multipleTexts"] && mode["ida"]["found"]) {
        TRANSPORTATION_JSON["defaultTransportation"]["ida"]["text"] = mode["ida"]["result"]["text"];
        TRANSPORTATION_JSON["defaultTransportation"]["ida"]["icon"] = mode["ida"]["result"]["icon"];
    }
    if (!mode["volta"]["multipleTexts"] && mode["volta"]["found"]) {
        TRANSPORTATION_JSON["defaultTransportation"]["volta"]["text"] = mode["volta"]["result"]["text"];
        TRANSPORTATION_JSON["defaultTransportation"]["volta"]["icon"] = mode["volta"]["result"]["icon"];
    }
}