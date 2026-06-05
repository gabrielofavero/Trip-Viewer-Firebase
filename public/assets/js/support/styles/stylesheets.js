// ======= CSS RULES =======
function _setCSSRule(selector, property, value) {
	const rule = `${property}: ${value};`;
	let styleElement = document.getElementById("custom-styles");

	if (!styleElement) {
		styleElement = document.createElement("style");
		styleElement.id = "custom-styles";
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

function _removeCSSRule(selector, property) {
	let styleElement = document.getElementById("custom-styles");
	if (!styleElement) {
		return;
	}

	const styleSheet = styleElement.sheet;
	for (let i = 0; i < styleSheet.cssRules.length; i++) {
		const cssRule = styleSheet.cssRules[i];
		if (cssRule.selectorText === selector) {
			cssRule.style.removeProperty(property);
			if (cssRule.style.length === 0) {
				styleSheet.deleteRule(i);
			}
			break;
		}
	}
}

function _setCSSRuleBatch(selector, properties) {
	for (const property in properties) {
		_setCSSRule(selector, property, properties[property]);
	}
}

function _removeCSSRuleBatch(selector, properties) {
	for (const property in properties) {
		_removeCSSRule(selector, properties[property]);
	}
}

// ======= CSS MEDIA RULES =======
function _setCSSMediaRule(media, selector, property, value) {
	const rule = `${selector} { ${property}: ${value}; }`;
	const mediaRule = `@media (${media}) { ${rule} }`;
	let styleElement = document.getElementById("custom-media-styles");

	if (!styleElement) {
		styleElement = document.createElement("style");
		styleElement.id = "custom-media-styles";
		document.head.appendChild(styleElement);
	}

	const styleSheet = styleElement.sheet;
	let mediaRuleIndex = -1;

	// Find existing media rule if it exists
	for (let i = 0; i < styleSheet.cssRules.length; i++) {
		const cssRule = styleSheet.cssRules[i];
		if (cssRule.media && cssRule.media.mediaText === `(${media})`) {
			mediaRuleIndex = i;
			break;
		}
	}

	if (mediaRuleIndex !== -1) {
		// Media rule exists, now find and update the selector rule within this media rule
		const mediaStyleSheet = styleSheet.cssRules[mediaRuleIndex].cssRules;
		let selectorRuleIndex = -1;

		for (let j = 0; j < mediaStyleSheet.length; j++) {
			const cssRule = mediaStyleSheet[j];
			if (cssRule.selectorText === selector) {
				selectorRuleIndex = j;
				break;
			}
		}

		if (selectorRuleIndex !== -1) {
			mediaStyleSheet[selectorRuleIndex].style[property] = value;
		} else {
			styleSheet.cssRules[mediaRuleIndex].insertRule(
				rule,
				mediaStyleSheet.length,
			);
		}
	} else {
		styleSheet.insertRule(mediaRule, styleSheet.cssRules.length);
	}
}

function _removeCSSMediaRule(media, selector, property) {
	let styleElement = document.getElementById("custom-media-styles");
	if (!styleElement) {
		return;
	}

	const styleSheet = styleElement.sheet;
	for (let i = 0; i < styleSheet.cssRules.length; i++) {
		const cssRule = styleSheet.cssRules[i];
		if (cssRule.media && cssRule.media.mediaText === `(${media})`) {
			const mediaStyleSheet = cssRule.cssRules;
			for (let j = 0; j < mediaStyleSheet.length; j++) {
				const cssRule = mediaStyleSheet[j];
				if (cssRule.selectorText === selector) {
					cssRule.style.removeProperty(property);
					if (cssRule.style.length === 0) {
						mediaStyleSheet.deleteRule(j);
					}
					break;
				}
			}
			if (mediaStyleSheet.length === 0) {
				styleSheet.deleteRule(i);
			}
			break;
		}
	}
}

function _setCSSMediaRuleBatch(media, selector, properties) {
	for (const property in properties) {
		_setCSSMediaRule(media, selector, property, properties[property]);
	}
}

function _removeCSSMediaRuleBatch(media, selector, properties) {
	for (const property in properties) {
		_removeCSSMediaRule(media, selector, properties[property]);
	}
}

// ======= CSS VARIABLES =======
function _setCSSVariable(variable, value) {
	document.documentElement.style.setProperty(`--${variable}`, value);
}

function _removeCSSVariable(variable) {
	document.documentElement.style.removeProperty(`--${variable}`);
}
