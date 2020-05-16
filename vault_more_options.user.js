// ==UserScript==
// @name         Torn: Vault: More options
// @namespace    lugburz.vault.more_options
// @version      0.1.3
// @description  Add 'Upkeep' button that automatically inputs the amount needed to pay upkeep.
// @author       Lugburz
// @match        https://www.torn.com/properties.php*
// @require      https://github.com/f2404/torn-userscripts/raw/master/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/vault_more_options.user.js
// @grant        none
// ==/UserScript==

function addRentButton() {
    const btnId = 'upkeepButton';
    const jqBtnId = '#' + btnId;

    const found = $('ul.options-list > li.upkeep-prop').text().match(/\(\$(\d+.+?)\)/);
    let upkeep = -1;
    if (typeof found !== 'undefined' && found !== null) {
        upkeep = found[1];
    }

    if (document.getElementById(btnId) == null) {
        $('div.vault-wrap > form.vault-cont.left > div.cont').append('<span id="' + btnId + '" class="btn-wrap silver"><span class="btn"><button class="torn-btn" title="Upkeep">$</button></span></span>');
    }

    if (upkeep < 1) {
        $(jqBtnId).addClass('disable');
    } else {
        $(jqBtnId).removeClass('disable');

        $(jqBtnId).on('click', function() {
            const input = $('div.vault-wrap > form.vault-cont.left > div.cont > div.input-money-group > input:text');
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

    ajax((page) => {
        if (page == "properties") {
            $('#properties-page-wrap').ready(addRentButton);
        }
    });
})();

