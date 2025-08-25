function _getNewSvg(id = '') {
    const idValue = id ? `id="${id}"` : '';
    return `<svg ${idValue} class="new" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg"
                xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 11.4 5.3"
                style="enable-background:new 0 0 11.4 5.3;" xml:space="preserve" height="1em">
                <style type="text/css">
                    .st0 {
                        fill: none;
                    }
                </style>
                <path
                    d="M11.4,4.8l-1.3-2.2l1.3-2.1c0.1-0.2,0-0.4-0.1-0.5c-0.1,0-0.1,0-0.2,0H0.7C0.3,0,0,0.3,0,0.7v4C0,5,0.3,5.3,0.7,5.3h10.4
            c0.2,0,0.3-0.1,0.3-0.3C11.4,4.9,11.4,4.9,11.4,4.8 M3.5,3.7H3.1L2,2.3v1.5H1.7V1.7H2l1.1,1.5V1.7h0.4L3.5,3.7z M5.6,2H4.4v0.5h1.1
            v0.3H4.4v0.5h1.2v0.3H4.1v-2h1.5L5.6,2z M8.4,3.7H8L7.5,2.2L7,3.7H6.6L5.9,1.7h0.4l0.4,1.5l0.5-1.5h0.4l0.5,1.5l0.4-1.5H9L8.4,3.7z" />
                <path class="st0" d="M0-3.3h12v12H0V-3.3z" />
            </svg>`
}

function _getAccordionArrow(fill='235859a7') {
    return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' class='teste' viewBox='0 0 16 16' fill='%${fill}'><path fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/></svg>`
}