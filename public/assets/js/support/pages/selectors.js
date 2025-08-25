// By Primary ID
export const getID = (id) => {
    return document.getElementById(id);
}

export function getIDs(divID) {
    const ids = [];
    for (const item of divID.split('-')) {
        if (!isNaN(item)) {
            ids.push(parseInt(item));
        }
    }
    return ids.join('-');
}

export function getChildIDs(parentId) {
    var parentElement = getID(parentId);

    if (parentElement) {
        var childElements = parentElement.children;
        var idsArray = [];

        for (var i = 0; i < childElements.length; i++) {
            var elementId = childElements[i].id;
            if (elementId) {
                idsArray.push(elementId);
            }
        }
        return idsArray;
    } else {
        console.error("Element with id '" + parentId + "' not found");
        return null;
    }
}

// By Secondary ID
export function getSecondaryID(id) {
    const jSplit = id.split("-");
    return parseInt(jSplit[jSplit.length - 1]);
}

export function getSecondaryIDs(parentID) {
    let result = [];
    if (!getID(parentID)) return result;
    for (const child of getChildIDs(parentID)) {
        const jSplit = child.split("-");
        result.push(parseInt(jSplit[jSplit.length - 1]));
    }
    return result;
}

export function findSecondaryIdFromPrimaryId(id, tipo) {
    const js = getSecondaryIDs(`${tipo}-box`);
    for (const j of js) {
        const result = getID(`${tipo}-id-${j}`).value;
        if (result === id) {
            return j;
        }
    }
    return 0;
}

export function getFirstSecondaryID(parentID) {
    const js = getSecondaryIDs(parentID);
    return js[0];
}

export function getLastSecondaryID(parentID) {
    const js = getSecondaryIDs(parentID);
    return js.length === 0 ? 0 : js[js.length - 1];
}

export function getNextSecondaryID(parentID) {
    return getLastSecondaryID(parentID) + 1;
}

// By El
export const select = (el, all = false) => {
    el = el.trim();
    if (all) {
        return [...document.querySelectorAll(el)];
    } else {
        return document.querySelector(el);
    }
};

export const on = (type, el, listener, all = false) => {
    if (el === 'document') {
        document.addEventListener(type, listener);
    } else if (el === 'window') {
        window.addEventListener(type, listener);
    } else {
        let selectEl = all ? [...document.querySelectorAll(el)] : [document.querySelector(el)];
        selectEl.forEach(e => e && e.addEventListener(type, listener));
    }
};

export const onscroll = (el, listener) => {
    el.addEventListener('scroll', listener)
}