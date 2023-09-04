// ==UserScript==
// @name         Torn: Faction: Simplified log view
// @namespace    lugburz.faction.simplified_log_view
// @version      0.4.0
// @description  Group similar messages in the faction armory log and provide a summary ("used x items").
// @author       Lugburz
// @match        https://www.torn.com/factions.php?step=your*
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/faction_simplified_log_view.user.js
// @downloadURL  https://github.com/f2404/torn-userscripts/raw/master/faction_simplified_log_view.user.js
// @grant        none
// ==/UserScript==

const armory_used_text = "one of the faction's";
const armory_deposited_text = 'deposited 1 x';

function maybe_update_row(row, n, from_time, to_time, to_date, msg_html) {
    if (msg_html.includes(armory_used_text)) {
        // used
        if (n === 1) {
            row.find('p[class^=message]').html(msg_html.replace(armory_used_text, `<b>${n}x</b>`).replace('items.', 'item.'));
        } else if (n > 1) {
            row.find('time[class^=dateTime]').html(`${from_time} -<br>&nbsp;${to_time}<br>${to_date}`);
            row.find('p[class^=message]').html(msg_html.replace(armory_used_text, `<b>${n}x</b>`));
        }
    } else {
        // deposited
        if (n > 1) {
            row.find('time[class^=dateTime]').html(`${from_time} -<br>&nbsp;${to_time}<br>${to_date}`);
            row.find('p[class^=message]').html(msg_html.replace(armory_deposited_text, `deposited <b>${n}x</b>`));
        }
    }
}

function simplify() {
    let n = 0;
    let msg_html = '';
    let from_date = '';
    let to_date = '';
    let from_time = '';
    let to_time = '';
    let row = '';

    const entries = $('#faction-main').find('li[class^=listItemWrapper]');
    if ($(entries).size() < 2) {
        return;
    }

    $(entries).each((i, entry) => {
        const time = $(entry).find('time[class^=dateTime]');
        const info = $(entry).find('p[class^=message]');

        if ($(info).html() === msg_html) {
            from_time = $(time).html().split('<br>')[0];
            from_date = $(time).html().split('<br>')[1];
            n++;
            $(entry).hide();
        } else if ($(info).text().includes(armory_used_text) || $(info).text().includes(armory_deposited_text)) {
            maybe_update_row(row, n, from_time, to_time, to_date, msg_html);

            msg_html = $(info).html();
            to_time = $(time).html().split('<br>')[0];
            to_date = $(time).html().split('<br>')[1];
            row = $(entry);
            n = 1;
        } else {
            maybe_update_row(row, n, from_time, to_time, to_date, msg_html);

            n = 0;
        }
    });

    maybe_update_row(row, n, from_time, to_time, to_date, msg_html);
}

(function() {
    'use strict';

    // Your code here...
})();

const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        for (const node of mutation.removedNodes) {
            if (node.classList) {
                node.classList.forEach(c => {
                    // use this as a sign that list has been updated
                    if (c.startsWith('preloaderWrapper')) simplify();
                });
            }
        }
    });
});

const wrapper = document.querySelector('#faction-main');
observer.observe(wrapper, { subtree: true, childList: true, characterData: false, attributes: false, attributeOldValue: false });
