// ==UserScript==
// @name         Cheat Town
// @namespace    lugburz.cheat_town
// @version      0.1
// @description  Torn: Cheat Town
// @author       Lugburz
// @match        https://www.torn.com/christmas_town.php*
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/cheat_town.user.js
// @run-at       document-body
// @grant        unsafeWindow
// ==/UserScript==

function addInterceptor() {
    const constantMock = unsafeWindow.fetch;

    unsafeWindow.fetch = function() {
        return new Promise((resolve, reject) => {
            constantMock.apply(this, arguments).then((response) => {
                let resolved = false;
                if (response.url.indexOf('christmas_town.php?q=move') > -1 || response.url.indexOf('christmas_town.php?q=initMap') > -1) {
                    resolved = true;
                    response.clone().text().then((text) => {
                        try {
                            const json = JSON.parse(text);
                            if (json.mapData) {
                                json.mapData.isAdmin = true;
                            }
                            const blob = new Blob([JSON.stringify(json, null, 2)], {type : 'application/json'});
                            const init = { "status" : 200 , "statusText" : "SuperSmashingGreat!" };
                            const myResponse = new Response(blob, init);
                            resolve(myResponse);
                        } catch (e) {
                            console.log(e);
                            resolved = false;
                        }
                    });
                }
                if (!resolved) resolve(response);
            });
        });
    }
};

(function() {
    'use strict';

    // Your code here...
    addInterceptor();
})();

addInterceptor();
