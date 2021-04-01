// ==UserScript==
// @name         Torn: Activity Log filter & export
// @namespace    lugburz.activity_log_filter_export
// @version      0.3.1
// @description  Activity Log filter & export.
// @author       Lugburz
// @match        https://www.torn.com/*
// @run-at       document-body
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/activity_log_filter_export.user.js
// @grant        unsafeWindow
// @grant        GM_registerMenuCommand
// ==/UserScript==

// Whether to export all (true) or only filtered (false) log messages.
var exportAll = true;

// Categories that you want to see - you can add multiple entries from the all categories list below.
// If this list is empty, all categories will be visible.
var visibleCategories = [
    //"Attacking", "Crimes", "Gym"
];

var allCategories = [
    "Ammo", "Attacking", "Authentication", "Awards", "Bail", "Bank", "Bazaars", "Books", "Bounties", "Captcha", "Casino", "Christmastown", "Church",
    "Cityfinds", "Company", "Competitions", "Crimes", "Donator", "Drugs", "Dump", "Education", "Enemieslist", "Equipping", "Events", "Faction",
    "Forums", "Friendslist", "Gym", "Halloweenbasket", "Happy", "Hospital", "Itemmarket", "Itemsending", "Itemuse", "Jail", "Job", "Levelup", "Life",
    "Loan", "Merits", "Messages", "Missions", "Moneysending", "Nerve", "Newsletters", "Parcels", "Pointsbuilding", "Pointsmarket", "Preferences",
    "Property", "Racing", "Seasonalgift", "Shops", "Stocks", "Tokenshop", "Trades", "Travel", "Vault", "Viruses"
];

var root = '#recent-history-wrapper > div.recent-history-content';

var hiddenIds = new Set();
var cats = new Set();

// for export
var activityLogs = new Set();
var logpageLogs = [];

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
                    // activity log dropdown
                    response.clone().text().then((text) => {
                        try {
                            const json = JSON.parse(text);
                            for (const l of json.log) {
                                if (exportAll || !exportAll && visibleCategories.length && visibleCategories.includes(l.category)) activityLogs.add(l);
                                if (visibleCategories.length && !visibleCategories.includes(l.category)) hiddenIds.add(l.ID);
                                cats.add(l.category);
                            }
                            //console.log(cats);
                            hideLogs();
                        } catch (e) {
                            console.log(e);
                        }
                    });
                } else if (response.url.indexOf('page.php?sid=activityLogUserData') > -1) {
                    // the Log page
                    response.clone().text().then((text) => {
                        try {
                            const json = JSON.parse(text);
                            for (const l of json.log) {
                                logpageLogs.push(l);
                            }
                            addExportButton();
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

function downloadCsv(csv) {
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

function exportActivityLog() {
    if (!activityLogs.size) {
        alert('Please open the activity log first');
        return;
    }

    let csv = 'time,category,text\n';
    for (const l of activityLogs) {
        const time = new Date(l.time * 1000);
        csv += [`"${time.toUTCString()}"`, l.category, `"${l.text.replace(/\n/g, ' ')}"`].join(',') + '\n';
    }
    downloadCsv(csv);
}

function addExportButton() {
    if ($('#exportLogsBtn').size() > 0) {
        return;
    }

    const button = '<button id="exportLogsBtn" class="button___1W2NU" style="line-height: 100%; color: var(--default-blue-color);" type="button">Export</button>';
    $('#activity-log-root').find('div[class^=buttonsWrapper]').append(button);

    $('#exportLogsBtn').on('click', () => {
        let csv = 'time,category,text\n';
        $('#activity-log-root').find('div[class^=logWrapper]').find('div[class^=actionInnerWrapper]').each((index, el) => {
            const id = $(el).find('span.log-text').attr('id').replace('text-', '');
            const l = logpageLogs.find(log => log.ID === id);
            const time = new Date(l.time * 1000);
            csv += [`"${time.toUTCString()}"`, l.category, `"${l.text.replace(/\n/g, ' ')}"`].join(',') + '\n';
        });
        downloadCsv(csv);
    });
}

(function() {
    'use strict';

    // Your code here...
    addInterceptor();

    $(root).ready(() => {
        if ($(root).get(0)) observer.observe($(root).get(0), { subtree: true, childList: true });
        GM_registerMenuCommand('Export Activity Log', exportActivityLog);
    });
})();
