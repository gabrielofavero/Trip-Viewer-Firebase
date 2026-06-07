// ======= CSS RULES =======
export function setCSSRule(selector, property, value) {
	const rule = `${property}: ${value};`;
	let styleElement = document.getElementById("custom-styles");

	if (!styleElement) {
		styleElement = document.createElement("style");
		styleElement.id = "custom-styles";
		document.head.appendChild(styleElement);
	}

	const styleSheet = (styleElement as HTMLStyleElement).sheet;
	let ruleIndex = -1;

	for (let i = 0; i < styleSheet.cssRules.length; i++) {
		const cssRule = styleSheet.cssRules[i] as CSSStyleRule;
		if (cssRule.selectorText === selector) {
			ruleIndex = i;
			break;
		}
	}

	if (ruleIndex !== -1) {
		const targetRule = styleSheet.cssRules[ruleIndex] as CSSStyleRule;
		if (targetRule.style) {
			targetRule.style[property] = value;
		} else {
			targetRule.style.setProperty(property, value);
		}
	} else {
		if (styleSheet.insertRule) {
			styleSheet.insertRule(`${selector} { ${rule} }`, 0);
		} else if (styleSheet.addRule) {
			styleSheet.addRule(selector, rule, 0);
		}
	}
}

export function removeCSSRule(selector, property) {
	let styleElement = document.getElementById("custom-styles");
	if (!styleElement) {
		return;
	}

	const styleSheet = (styleElement as HTMLStyleElement).sheet;
	for (let i = 0; i < styleSheet.cssRules.length; i++) {
		const cssRule = styleSheet.cssRules[i] as CSSStyleRule;
		if (cssRule.selectorText === selector) {
			cssRule.style.removeProperty(property);
			if (cssRule.style.length === 0) {
				styleSheet.deleteRule(i);
			}
			break;
		}
	}
}

export function setCSSRuleBatch(selector, properties) {
	for (const property in properties) {
		setCSSRule(selector, property, properties[property]);
	}
}

export function removeCSSRuleBatch(selector, properties) {
	for (const property in properties) {
		removeCSSRule(selector, properties[property]);
	}
}

// ======= CSS MEDIA RULES =======
export function setCSSMediaRule(media, selector, property, value) {
	const rule = `${selector} { ${property}: ${value}; }`;
	const mediaRule = `@media (${media}) { ${rule} }`;
	let styleElement = document.getElementById("custom-media-styles");

	if (!styleElement) {
		styleElement = document.createElement("style");
		styleElement.id = "custom-media-styles";
		document.head.appendChild(styleElement);
	}

	const styleSheet = (styleElement as HTMLStyleElement).sheet;
	let mediaRuleIndex = -1;

	// Find existing media rule if it exists
	for (let i = 0; i < styleSheet.cssRules.length; i++) {
		const cssRule = styleSheet.cssRules[i] as CSSMediaRule;
		if (cssRule.media && cssRule.media.mediaText === `(${media})`) {
			mediaRuleIndex = i;
			break;
		}
	}

	if (mediaRuleIndex !== -1) {
		// Media rule exists, now find and update the selector rule within this media rule
		const mediaRule = styleSheet.cssRules[mediaRuleIndex] as CSSMediaRule;
		const mediaStyleSheet = mediaRule.cssRules;
		let selectorRuleIndex = -1;

		for (let j = 0; j < mediaStyleSheet.length; j++) {
			const cssRule = mediaStyleSheet[j] as CSSStyleRule;
			if (cssRule.selectorText === selector) {
				selectorRuleIndex = j;
				break;
			}
		}

		if (selectorRuleIndex !== -1) {
			(mediaStyleSheet[selectorRuleIndex] as CSSStyleRule).style[property] = value;
		} else {
			mediaRule.insertRule(
				rule,
				mediaStyleSheet.length,
			);
		}
	} else {
		styleSheet.insertRule(mediaRule, styleSheet.cssRules.length);
	}
}

export function removeCSSMediaRule(media, selector, property) {
	let styleElement = document.getElementById("custom-media-styles");
	if (!styleElement) {
		return;
	}

	const styleSheet = (styleElement as HTMLStyleElement).sheet;
	for (let i = 0; i < styleSheet.cssRules.length; i++) {
		const cssRule = styleSheet.cssRules[i] as CSSMediaRule;
		if (cssRule.media && cssRule.media.mediaText === `(${media})`) {
			const mediaStyleSheet = cssRule.cssRules;
			for (let j = 0; j < mediaStyleSheet.length; j++) {
			const innerRule = mediaStyleSheet[j] as CSSStyleRule;
			if (innerRule.selectorText === selector) {
				innerRule.style.removeProperty(property);
				if (innerRule.style.length === 0) {
					(mediaStyleSheet as any).deleteRule(j);
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

export function setCSSMediaRuleBatch(media, selector, properties) {
	for (const property in properties) {
		setCSSMediaRule(media, selector, property, properties[property]);
	}
}

export function removeCSSMediaRuleBatch(media, selector, properties) {
	for (const property in properties) {
		removeCSSMediaRule(media, selector, properties[property]);
	}
}

// ======= CSS VARIABLES =======
export function setCSSVariable(variable, value) {
	document.documentElement.style.setProperty(`--${variable}`, value);
}

export function removeCSSVariable(variable) {
	document.documentElement.style.removeProperty(`--${variable}`);
}


