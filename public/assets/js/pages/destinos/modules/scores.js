function _getScoreColor(score) {
    if (score == "?") {
      return "#ead1dc";
    } else {
      let numb = parseInt(score);
      if (numb == 100) {
        return "#CFE2F3";
      } else if (numb >= 75) {
        return "#D9EAD3";
      } else if (numb >= 50) {
        return "#FFF2CC";
      } else if (numb >= 25) {
        return "#FCE5CD";
      } else return "#F4CCCC";
    }
  }
  
  function _getScore(score, PLACES_SETTINGS_JSON, SINGLE_SCORES_OBJ, i) {
    let possibleValues = PLACES_SETTINGS_JSON["scores"]["possibleValues"]
    if (score && !possibleValues.includes(score)) {
      return score;
    } else if (score && possibleValues.includes(score)) {
      return _getIndividualScore(score);
    } else {
      let values = [];
      let keys = Object.keys(SINGLE_SCORES_OBJ);
      for (let j = 0; j < keys.length; j++) {
        let currentValues = SINGLE_SCORES_OBJ[keys[j]][i];
        if (currentValues) {
          values.push(currentValues);
        }
      }
      if (values.length > 0) {
        return _getMultipleScores(values);
      } else return "?";
    }
  
  }
  
  function _getIndividualScore(singleScore) {
    switch (singleScore) {
      case "!":
        return "100%";
      case "1":
        return "75%";
      case "2":
        return "50%";
      case "3":
        return "25%";
      case "4":
        return "0%";
      default:
        return "?";
    }
  }
  
  function _getMultipleScores(multipleScores) {
    let result = 0;
    let count = 0;
    for (let i = 0; i < multipleScores.length; i++) {
      let currentScore = _getIndividualScore(multipleScores[i]);
      if (currentScore != "?") {
        result += parseInt(currentScore);
        count++;
      }
    }
    if (count > 0) {
      return Math.round(result / count) + "%";
    } else {
      return "?";
    }
  }
  
  function _getSingleScoresObj(pass, NOTAS_OBJ) {
    let knownKeys = NOTAS_OBJ["knownKeys"];
    let possibleValues = NOTAS_OBJ["possibleValues"];
    let keys = Object.keys(pass);
    let result = {};
    for (let i = 0; i < keys.length; i++) {
      if (!knownKeys.includes(keys[i])) {
        let possibleVauluesArray = pass[keys[i]];
        let isSingleScore = true;
        for (let j = 0; j < possibleVauluesArray.length; j++) {
          if (!possibleValues.includes(possibleVauluesArray[j])) {
            isSingleScore = false;
            break;
          }
        }
        if (isSingleScore) {
          result[keys[i]] = possibleVauluesArray;
        }
      }
    }
    return result;
  }
  
  function _getNumericScore(score) {
    let filteredScore = score.replace("%", "");
    if (!isNaN(filteredScore)) {
      return parseInt(filteredScore);
    } else return -1;
  }