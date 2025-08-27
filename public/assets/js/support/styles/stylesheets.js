export function setCSSRule(selector, property, value) {
    const rule = `${property}: ${value};`;
    let styleElement = document.getElementById('custom-styles');

    if (!styleElement) {
         styleElement = document.createElement('style');
         styleElement.id = 'custom-styles';
         document.head.appendChild(styleElement);
    }

    const styleSheet = styleElement.sheet;
    let ruleIndex = -1;

    for (let i = 0; i < styleSheet.cssRules.length; i++) {
         const cssRule = styleSheet.cssRules[i];
         if (cssRule.selectorText === selector) {
              ruleIndex = i;
              break;
         }
    }

    if (ruleIndex !== -1) {
         if (styleSheet.cssRules[ruleIndex].style) {
              styleSheet.cssRules[ruleIndex].style[property] = value;
         } else {
              styleSheet.cssRules[ruleIndex].style.setProperty(property, value);
         }
    } else {
         if (styleSheet.insertRule) {
              styleSheet.insertRule(`${selector} { ${rule} }`, 0);
         } else if (styleSheet.addRule) {
              styleSheet.addRule(selector, rule, 0);
         }
    }
}

export function setCSSVariable(variable, value) {
    document.documentElement.style.setProperty(`--${variable}`, value);
}