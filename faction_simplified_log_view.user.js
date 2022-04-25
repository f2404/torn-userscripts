// ==UserScript==
// @name         Torn: Faction: Simplified log view
// @namespace    lugburz.faction.simplified_log_view
// @version      0.3.3
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
            row.find('span.info').html(msg_html.replace(armory_used_text, `<b>${n}x</b>`).replace('items.', 'item.'));
        } else if (n > 1) {
            row.find('span.date').text(`${from_time} - ${to_time} ${to_date}`);
            row.find('span.info').html(msg_html.replace(armory_used_text, `<b>${n}x</b>`));
        }
    } else {
        // deposited
        if (n > 1) {
            row.find('span.date').text(`${from_time} - ${to_time} ${to_date}`);
            row.find('span.info').html(msg_html.replace(armory_deposited_text, `deposited <b>${n}x</b>`));
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

    const entries = $('#faction-news-root').find('li');
    if ($(entries).size() < 2) {
        return;
    }

    $(entries).each((i, entry) => {
        const time = $(entry).find('span')[1];
        const date = $(entry).find('span')[2];
        const info = $(entry).find('span.info');

        if ($(entry).find(info).html() === msg_html) {
            from_time = $(entry).find('span').find(time).text();
            from_date = $(entry).find('span').find(date).text();
            n++;
            $(entry).hide();
        } else if ($(entry).find(info).text().includes(armory_used_text) || $(entry).find(info).text().includes(armory_deposited_text)) {
            maybe_update_row(row, n, from_time, to_time, to_date, msg_html);

            msg_html = $(entry).find(info).html();
            to_time = $(entry).find('span').find(time).text();
            to_date = $(entry).find('span').find(date).text();
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
