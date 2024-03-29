// ==UserScript==
// @name         Torn: Gimme basket
// @namespace    lugburz.gimme_basket
// @version      0.1.3
// @description  Gimme basket!
// @author       Lugburz
// @match        https://www.torn.com/shops.php?step=candy*
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/gimme_basket.user.js
// @grant        none
// ==/UserScript==

function addButton() {
    if ($('div.content-title > h4').size() > 0 && $('#buyBasketBtn').size() < 1) {
        const button = `<button id="buyBasketBtn" style="color: var(--default-blue-color); cursor: pointer; margin-right: 0;">Gimme basket!</button>
                        <span id="buyBasketResult" style="font-size: 12px; font-weight: 100;"></span>`;
        $('div.content-title > h4').append(button);
        $('#buyBasketBtn').on('click', async () => {
            $('#buyBasketResult').text('');
            await getAction({
                type: 'post',
                action: 'shops.php',
                data: {
                    step: 'buyShopItem',
                    ID: 920,
                    amount: 1
                },
                success: (str) => {
                    try {
                        const msg = JSON.parse(str);
                        $('#buyBasketResult').html(msg.text).css('color', msg.success ? 'green' : 'red');
                    } catch (e) {
                        console.log(e);
                    }
                }
            });
        });
    }
};

(function() {
    'use strict';

    // Your code here...
    addButton();
})();
