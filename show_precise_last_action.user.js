// ==UserScript==
// @name         Torn: Profile: Show precise last action
// @namespace    lugburz.profile.show_precise_last_action
// @version      0.1
// @description  Show precise last action on profiles.
// @author       Lugburz [2386297]
// @match        https://www.torn.com/profiles.php?XID=*
// @match        https://www.torn.com/profiles.php?NID=*
// @require      https://github.com/f2404/torn-userscripts/raw/7401f7e0c5b2dfaaa47988684ca518316750520e/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/show_precise_last_action.user.js
// @downloadURL  https://github.com/f2404/torn-userscripts/raw/master/show_precise_last_action.user.js
// @grant        none
// @run-at       document-body
// ==/UserScript==

function parseLastAction(text) {
    try {
        const json = JSON.parse(text);
        const lastAction = json.basicInformation.lastAction.seconds !== 'Unknown' ? secondsToDhms(json.basicInformation.lastAction.seconds) + ' ago' : json.basicInformation.lastAction.seconds;
        if ($('ul.info-table').size() > 0) {
            $('ul.info-table > li').each((i, item) => {
                if ($(item).find('span:contains("Last action")').size() > 0) {
                    $(item).find('div.user-info-value > span').text(lastAction);
                }
            });
        }
    } catch (e) {
        console.log(e);
    }
}

ajax((page, xhr) => {
    if (page !== 'profiles') return;
    parseLastAction(xhr.responseText);
});
