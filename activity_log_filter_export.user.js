// ==UserScript==
// @name         Torn: Activity Log filter & export
// @namespace    lugburz.activity_log_filter_export
// @version      0.1
// @description  Activity Log filter & export.
// @author       Lugburz
// @match        https://www.torn.com/*
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/activity_log_filter_export.user.js
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// ==/UserScript==

// Categories that you want to see - you can add multiple entries from the all categories list below.
// If this list is empty, all categories will be visible.
var visibleCategories = [
    //"Attacking", "Crimes", "Gym"
];

var allCategories = [
    "Ammo", "Attacking", "Authentication", "Awards", "Bank", "Bazaars", "Captcha", "Casino", "Church", "Cityfinds", "Company", "Competitions", "Crimes",
    "Drugs", "Dump", "Education", "Enemieslist", "Equipping", "Events", "Faction", "Forums", "Friendslist", "Gym", "Halloweenbasket", "Hospital",
    "Itemmarket", "Itemsending", "Itemuse", "Jail", "Levelup", "Life", "Merits", "Messages", "Missions", "Moneysending", "Nerve", "Newsletters",
    "Parcels", "Pointsbuilding", "Pointsmarket", "Preferences", "Property", "Racing", "Shops", "Stocks", "Trades", "Travel", "Vault", "Viruses"
];

var root = '#recent-history-wrapper > div.recent-history-content';

var hiddenIds = new Set();
var cats = new Set();

// for export
var logs = new Set();

function hideLogs() {
    if (!hiddenIds.size) return;

    $(root).find('div[class^=actionWrapper___]').each((i, el) => {
        const id = $(el).find('span[class^=text___]').attr('id').replace('text-', '');
        if (hiddenIds.has(id)) $(el).hide();
    });
}

function addInterceptor() {
    const constantMock = unsafeWindow.fetch;

    unsafeWindow.fetch = function() {
        return new Promise((resolve, reject) => {
            constantMock.apply(this, arguments).then((response) => {
                if (response.url.indexOf('page.php?sid=activityLogData') > -1) {
                    response.clone().text().then((text) => {
                        try {
                            const json = JSON.parse(text);
                            for (const l of json.log) {
                                logs.add(l);
                                if (visibleCategories.length && !visibleCategories.includes(l.category)) hiddenIds.add(l.ID);
                                cats.add(l.category);
                            }
                            //console.log(cats);
                            hideLogs();
                        } catch (e) {
                            console.log(e);
                        }
                    });
                }
                resolve(response);
            });
        });
    }
};

const observer = new MutationObserver((mutations) => {
    hideLogs();
});

function exportLog() {
    if (!logs.size) {
        alert('Please open the activity log first');
        return;
    }

    let csv = 'time,category,text\n';
    for (const l of logs) {
        const time = new Date(l.time * 1000);
        csv += [`"${time.toUTCString()}"`, l.category, `"${l.text.replace(/\n/g, ' ')}"`].join(',') + '\n';
    }
    const myblob = new Blob([csv], {type: 'application/octet-stream'});
    const myurl = window.URL.createObjectURL(myblob);

    const ancorTag = document.createElement('a');
    ancorTag.href = myurl;
    ancorTag.target = '_blank';
    ancorTag.download = 'activity_log.csv';
    document.body.appendChild(ancorTag);
    ancorTag.click();
    document.body.removeChild(ancorTag);
}

(function() {
    'use strict';

    // Your code here...
    $(root).ready(() => {
        addInterceptor();
        observer.observe($(root).get(0), { subtree: true, childList: true });
        GM_registerMenuCommand('Export Activity Log', exportLog);
    });
})();
