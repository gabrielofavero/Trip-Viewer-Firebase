function _switchPinVisibility() {
    if (getID('pin-disable').checked) {
        getID('pin-container').style.display = 'none';
    } else {
        getID('pin-container').style.display = 'block';
    }
}