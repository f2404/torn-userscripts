// ==UserScript==
// @name         Torn: Loot timer on NPC profile
// @namespace    lugburz.show_timer_on_npc_profile
// @version      0.2.20
// @description  Add a countdown timer to desired loot level on the NPC profile page as well as on the sidebar and the topbar (optionally).
// @author       Lugburz
// @match        https://www.torn.com/*
// @require      https://github.com/f2404/torn-userscripts/raw/410fc2fb1dc4d2f21b90709687b97786641c15af/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/npc_profile_loot_timer.user.js
// @connect      yata.yt
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

// Whether or not to show timer in sidebar
const SIDEBAR_TIMERS = true;

// Whether or not to show timer in topbar
const TOPBAR_TIMERS = true;

// Whether or not to change the timer color when it's close to running out
const CHANGE_COLOR = true;

// The NPC's to watch. Remove any that you don't want
// Format: 'NPC_name': { id: NPC_id, loot_level: desired_loot_level_for_this_NPC }
const NPCS = {
    'Duke': { id: 4, loot_level: 4 },
    'Scrooge': { id: 10, loot_level: 4 },
    'Leslie': { id: 15, loot_level: 4 },
    'Jimmy': { id: 19, loot_level: 4 },
    'Fernando': { id: 20, loot_level: 4 }
};


GM_addStyle(`
.timers-div {
  background: #f2f2f2;
  line-height: 16px;
  padding: 8px 10px 0;
  margin: 1px 0;
  border-bottom-right-radius: 5px;
  border-top-right-radius: 5px;
  cursor: default;
  overflow: hidden;
  border-bottom: 1px solid #fff;
}
.orange-timer {
  color: orange;
}
.red-timer {
  color: red;
}
.show-hide {
  color: #069;
  text-decoration: none;
  cursor: pointer;
  float: right;
  -webkit-transition: color .2s ease;
  -o-transition: color .2s ease;
  transition: color .2s ease;
}`);

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
const TIMINGS = [0, 30*60, 90*60, 210*60, 450*60]; // till loot levels
const LOGGING_ENABLED = false;

const yata_api = async () => {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://yata.yt/api/v1/loot/',
            headers: {
                'Content-Type': 'application/json'
            },
            onload: (response) => {
                try {
                    const resjson = JSON.parse(response.responseText);
                    resolve(resjson);
                } catch (err) {
                    reject(err);
                }
            },
            onerror: (err) => {
                reject(err);
            }
        });
    });
}

function getLootLevel(id) {
    let loot_level = 0;
    Object.values(NPCS).forEach(npc => {
        if (npc.id == id) {
            loot_level = npc.loot_level;
        }
    });
    return loot_level;
}

function getDesiredLootLevelTs(data, id) {
    if (!data.hosp_out[id]) return -1;
    const loot_level = getLootLevel(id);
    return data.hosp_out[id] + TIMINGS[loot_level - 1];
}

function isCachedDataValid(id = '') {
    const str_data = GM_getValue('cached_data');
    let data = '';
    try {
        data = JSON.parse(str_data);
    } catch (e) {
        return false;
    }

    if (!data.next_update) {
        return false;
    }

    const now = new Date().getTime();
    const last_updated = GM_getValue('last_updated');
    // do not call the API too often
    if ((now - last_updated < 10*60*1000) && (Math.floor(now / 1000) < data.next_update)) {
        return true;
    }

    if (id) {
        const loot_level = getLootLevel(id);
        if (!loot_level || !data.hosp_out[id] || getDesiredLootLevelTs(data, id) * 1000 < now) {
            return false;
        }
    } else {
        for (let id of Object.keys(data)) {
            const loot_level = getLootLevel(id);
            if (!loot_level || getDesiredLootLevelTs(data, id) * 1000 < now) {
                return false;
            }
        }
    }
    return true;
}

async function getTimings(id) {
    if (!isCachedDataValid(id)) {
        log('Calling the API id=' + id);
        const data = await yata_api();
        GM_setValue('cached_data', JSON.stringify(data));
        GM_setValue('last_updated', new Date().getTime());
    }

    const cached_data = JSON.parse(GM_getValue('cached_data'));
    if (cached_data.error) {
        console.error(`YATA API error: code=${cached_data.error.code} error=${cached_data.error.error}`);
        return -1;
    }
    // no data on the id
    if (!cached_data.hosp_out[id]) {
        return -1;
    }
    // timestamp of desired loot level
    return getDesiredLootLevelTs(cached_data, id);
}

async function getAllTimings() {
    if (!isCachedDataValid()) {
        log('Calling the API');
        const data = await yata_api();
        GM_setValue('cached_data', JSON.stringify(data));
        GM_setValue('last_updated', new Date().getTime());
    }

    const cached_data = JSON.parse(GM_getValue('cached_data'));
    if (cached_data.error) {
        console.error(`YATA API error: code=${cached_data.error.code} error=${cached_data.error.error}`);
        return '';
    }
    return cached_data;
}

function hideTimers(hide, yataData, sidebar = true) {
    log(yataData);
    if (sidebar) {
        Object.values(NPCS).forEach(npc => (hide || yataData.hosp_out[npc.id] === undefined) ? $(`#npcTimer${npc.id}`).hide() : $(`#npcTimer${npc.id}`).show());
        $('#showHideTimers').text(`[${hide ? 'show' : 'hide'}]`);
    } else {
        Object.values(NPCS).forEach(npc => (hide || yataData.hosp_out[npc.id] === undefined) ? $(`#npcTimerTop${npc.id}`).hide() : $(`#npcTimerTop${npc.id}`).show());
        $('#showHideTopbarTimers').text(`[${hide ? 'show' : 'hide'}]`);
    }
}

function maybeChangeColors(span, left) {
    if (CHANGE_COLOR) {
        if (left < 5 * 60 * 1000) { // 5 minutes
            $(span).addClass('red-timer');
        } else if (left < 10 * 60 * 1000) { // 10 minutes
            $(span).addClass('orange-timer');
        } else {
            $(span).removeClass('orange-timer');
            $(span).removeClass('red-timer');
        }
    }
}

function formatTimeSec(msec) {
    return formatTimeMsec(msec).replace(/\..+/, '');
}

function process(ts, loot_level) {
    if (ts < 0) {
        return;
    }

    // ts is s, Date is ms
    const due = new Date(ts * 1000);

    let x = setInterval(function () {
        const now = new Date().getTime();
        const left = due - now;
        if (left < 0) {
            clearInterval(x);
            return;
        }

        // Display the result
        const span = $('div.profile-status').find('div.profile-container').find('div.description').find('span.sub-desc');
        let html = $(span).html();
        if (html) {
            const n = html.indexOf('(');
            html = html.substring(0, n != -1 ? n - 1 : html.length);
            $(span).html(html + " (Till loot level " + ROMAN[loot_level - 1] + ": " + formatTimeSecWithLetters(left) + ")");
        }
    }, 1000);
}

function addNpcTimers(data) {
    if (!data)
        return;

    const isMobile = ($('#tcLogo').height() < 50);
    const getLl = (elapsed => (elapsed < TIMINGS[TIMINGS.length - 1]) ? ROMAN[TIMINGS.findIndex(t => elapsed < t) - 1] : ROMAN[ROMAN.length - 1]);

    log('Adding NPC Timers for:')
    log(NPCS);
    if (SIDEBAR_TIMERS && $('#sidebarNpcTimers').size() < 1) {
        let div = '<hr class="delimiter___neME6"><div id="sidebarNpcTimers"><span style="font-weight: 700;">NPC Timers</span><a id="showHideTimers" class="show-hide">[hide]</a>';
        Object.keys(NPCS).forEach(name => {
            div += '<p style="line-height: 20px; text-decoration: none;" id="npcTimer' + NPCS[name].id + '"><a class="t-blue href desc" style="display:inline-block;" href="/loader.php?sid=attack&user2ID=' +
                NPCS[name].id + '">' + name + '</a><span style="float: right;"></span></p>';
        });
        div += '</div>';
        $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]').append(div);
        //$(div).insertBefore($('#sidebar').find('h2[class^=header__]').eq(1)); // second header
        $('#showHideTimers').on('click', function () {
            const hide = $('#showHideTimers').text() == '[hide]';
            GM_setValue('hideSidebarTimers', hide);
            hideTimers(hide, data);
        });
    }

    if (TOPBAR_TIMERS && $('#topbarNpcTimers').size() < 1) {
        let div = '<div id="topbarNpcTimers" class="container" style="line-height: 28px;"><span style="font-weight: 700;">' +
            'NPC Timers&nbsp;<a id="showHideTopbarTimers" class="t-blue href desc" style="cursor: pointer; display:inline-block; width: 45px;">[hide]</a></span>';
        Object.keys(NPCS).forEach(name => {
            div += '<span style="text-decoration: none;" id="npcTimerTop' + NPCS[name].id + '"><a class="t-blue href desc" style="display:inline-block;" href="/loader.php?sid=attack&user2ID=' +
                `${NPCS[name].id}">${name}:&nbsp;</a><span style="display:inline-block; width: ${isMobile? 50 : 80}px;"></span></span>`;
        });
        div += '</div>';
        if ($('div.header-wrapper-bottom').find('div.container').size() > 0) {
            // announcement
            $('div.header-wrapper-bottom').find('div.container').append(div);
            $('#topbarNpcTimers').css('color', 'black');
            $('#topbarNpcTimers').find('a').css('color', '#069');
        } else {
            $('div.header-wrapper-bottom').prepend(div);
        }
        $('#showHideTopbarTimers').on('click', function () {
            const hide = $('#showHideTopbarTimers').text() == '[hide]';
            GM_setValue('hideTopbarTimers', hide);
            hideTimers(hide, data, false);
        });
        // phone or desktop mode
        $('#topbarNpcTimers').find('span').first().css('padding-left', isMobile ? '4px' : '190px');
    }

    if (SIDEBAR_TIMERS) {
        const hide = GM_getValue('hideSidebarTimers');
        hideTimers(hide, data);
    }
    if (TOPBAR_TIMERS) {
        const hide = GM_getValue('hideTopbarTimers');
        hideTimers(hide, data, false);
    }

    Object.keys(NPCS).forEach(name => {
        const id = NPCS[name].id;
        const loot_level = NPCS[name].loot_level;
        const pId = '#npcTimer' + id;
        const spanId = '#npcTimerTop' + id;
        if (data.hosp_out[id]) {
            const ts = getDesiredLootLevelTs(data, id);

            // ts is s, Date is ms
            const due = new Date(ts * 1000);
            let x = setInterval(function () {
                const now = new Date().getTime();
                const left = due - now;

                // Display the results
                if (SIDEBAR_TIMERS) {
                    $(pId).attr('notavail', '');
                    const span = $(pId).find('span');
                    let text;
                    if (left < 0) {
                        const elapsed = Math.floor(now / 1000) - data.hosp_out[id];
                        text = elapsed < 0 ? 'Hosp' : `Loot level ${getLl(elapsed)}`;
                    } else {
                        text = formatTimeSecWithLetters(left);
                    }
                    $(span).text(text);
                    maybeChangeColors(span, left);
                }
                if (TOPBAR_TIMERS) {
                    $(spanId).attr('notavail', '');
                    const span = $(spanId).find('span');
                    let text;
                    if (left < 0) {
                        const elapsed = Math.floor(now / 1000) - data.hosp_out[id];
                        text = elapsed < 0 ? 'Hosp' : (isMobile ? `LL ${getLl(elapsed)}` : `Loot level ${getLl(elapsed)}`);
                    } else {
                        text = isMobile ? formatTimeSec(left) : formatTimeSecWithLetters(left);
                    }
                    $(span).text(text);
                    maybeChangeColors(span, left);
                }

                if (left < 0) {
                    clearInterval(x);
                }
            }, 1000);
        } else {
            $(pId).attr('notavail', 1);
            $(pId).hide();
            $(spanId).attr('notavail', 1);
            $(spanId).hide();
        }
    })
}

(function () {
    'use strict';

    // Your code here...
    if ($(location).attr('href').includes('profiles.php')) {
        const profileId = RegExp(/XID=(\d+)/).exec($(location).attr('href'))[1];
        Object.values(NPCS).forEach(npc => {
            if (npc.id == profileId) {
                getTimings(profileId).then(ts => process(ts, npc.loot_level));
            }
        });
    }
    if (SIDEBAR_TIMERS && $('#sidebar').size() > 0 || TOPBAR_TIMERS && $('div.header-wrapper-bottom').size() > 0) {
        getAllTimings().then(data => addNpcTimers(data));
    }
})();

function log(data) {
    if (LOGGING_ENABLED) console.log(data)
}
