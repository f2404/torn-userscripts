// ==UserScript==
// @name         Torn: Vault: More options
// @namespace    lugburz.vault.more_options
// @version      0.1.1
// @description  Add 'Upkeep' button that automatically inputs the amount needed to pay upkeep.
// @author       Lugburz
// @match        https://www.torn.com/properties.php*
// @require      https://greasyfork.org/scripts/390917-dkk-torn-utilities/code/DKK%20Torn%20Utilities.js?version=744690
// @grant        none
// ==/UserScript==

function addRentButton() {
    let btnId = 'upkeepButton';
    let jqBtnId = '#' + btnId;

    let upkeep = -1;
    let found = $('ul.options-list > li.upkeep-prop').text().match(/\(\$(\d+.+?)\)/);
    if (typeof found !== 'undefined' && found !== null) {
        upkeep = found[1];
    }

    if (document.getElementById(btnId) == null) {
        $('div.vault-wrap > form.vault-cont.left > div.cont').append('<span id="' + btnId + '" class="btn-wrap silver"><span class="btn"><button class="wai-btn button-btn">Upkeep</button></span></span>');
    }

    if (upkeep < 1) {
        $(jqBtnId).addClass('disable');
    } else {
        $(jqBtnId).removeClass('disable');

        $(jqBtnId).on('click', function() {
            let input = $('div.vault-wrap > form.vault-cont.left > div.cont > div.input-money-group > input:text');
            if (input.val() == '') {
                input.val(upkeep);
                input.blur();
            }
        });
    }
}

(function() {
    'use strict';

    // Your code here...
    if (!$(location).attr('href').includes('p=options&tab=vault')) {
        return;
    }

    ajax((page, json, uri) => {
        if (page == "properties") {
            $('#properties-page-wrap').ready(addRentButton);
        }
    });
})();
