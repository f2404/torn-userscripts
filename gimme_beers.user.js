// ==UserScript==
// @name         Torn: Gimme beers
// @namespace    lugburz.gimme_beers
// @version      0.1.3
// @description  Gimme beers!
// @author       Lugburz
// @match        https://www.torn.com/shops.php?step=bitsnbobs*
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/gimme_beers.user.js
// @grant        none
// ==/UserScript==

function addButton() {
    if ($('div.content-title > h4').size() > 0 && $('#buyBeerBtn').size() < 1) {
        const button = `<button id="buyBeerBtn" style="color: var(--default-blue-color); cursor: pointer; margin-right: 0;">Gimme beers!</button>
                        <span id="buyBeerResult" style="font-size: 12px; font-weight: 100;"></span>`;
        $('div.content-title > h4').append(button);
        $('#buyBeerBtn').on('click', async () => {
            $('#buyBeerResult').text('');
            await getAction({
                type: 'post',
                action: 'shops.php',
                data: {
                    step: 'buyShopItem',
                    ID: 180,
                    amount: 100,
                    shoparea: 103
                },
                success: (str) => {
                    try {
                        const msg = JSON.parse(str);
                        $('#buyBeerResult').html(msg.text).css('color', msg.success ? 'green' : 'red');
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
