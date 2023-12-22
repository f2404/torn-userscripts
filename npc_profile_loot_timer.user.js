// ==UserScript==
// @name         Torn: Loot timer on NPC profile
// @namespace    lugburz.show_timer_on_npc_profile
// @version      0.4.0
// @description  Add a countdown timer to desired loot level on the NPC profile page as well as in the sidebar and the topbar (optionally).
// @author       Lugburz
// @match        https://www.torn.com/*
// @require      https://raw.githubusercontent.com/f2404/torn-userscripts/d8fb88fbc7e03173aa81b1b466b1d2a251a70aad/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/npc_profile_loot_timer.user.js
// @downloadURL  https://github.com/f2404/torn-userscripts/raw/master/npc_profile_loot_timer.user.js
// @connect      yata.yt
// @connect      api.lzpt.io
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

// Whether or not to show timer in sidebar
// true by default
const SIDEBAR_TIMERS = true;

// Whether or not to show timer in topbar
//true by default
const TOPBAR_TIMERS = true;

// Whether or not to show scheduled attack timer provided by the Loot Rangers discord API
// true by default
const ATTACK_TIMER = true;

// Whether or not to change the timer color when it's close to running out (true by default)
const CHANGE_COLOR = true;

// The NPC's to watch. Remove any that you don't want
// Format: 'NPC_name': { id: NPC_id, loot_level: desired_loot_level_for_this_NPC }
const NPCS = {
    'Duke': { id: 4, loot_level: 4 },
    'Scrooge': { id: 10, loot_level: 4 },
    'Leslie': { id: 15, loot_level: 4 },
    'Jimmy': { id: 19, loot_level: 4 },
    'Nando': { id: 20, loot_level: 4 },
    'Tiny': { id: 21, loot_level: 4 },
    'Bunny': { id: 17, loot_level: 4 }
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

const YATA_API_URL = 'https://yata.yt/api/v1/loot/';
const ATTACK_TIMER_API_URL = 'https://api.lzpt.io/loot/';

const call_api = async (url) => {
    return new Promise(resolve => {
        GM_xmlhttpRequest({
            method: 'GET',
            url,
            headers: {
                'Content-Type': 'application/json'
            },
            onload: (response) => {
                try {
                    const resjson = JSON.parse(response.responseText);
                    resolve(resjson);
                } catch (err) {
                    console.error(url, err);
                    resolve(null);
                }
            },
            onerror: (err) => {
                console.error(url, err);
                resolve(null);
            }
        });
    });
}

/* Loot Timers */

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
    const hosp_out = data.hosp_out && data.hosp_out[id] || data.npcs && data.npcs[id] && data.npcs[id].hosp_out;
    if (!hosp_out) {
        return -1;
    }
    const loot_level = getLootLevel(id);
    return hosp_out + TIMINGS[loot_level - 1];
}

function isCachedDataValid(id = '') {
    const str_data = GM_getValue('cached_data');
    let data = '';
    try {
        data = JSON.parse(str_data);
    } catch (e) {
        return false;
    }

    const now = new Date().getTime();
    const last_updated = GM_getValue('last_updated');
    const next_update = data.next_update || Math.floor(now / 1000) + 1; // next_update doesn't exit in lzpt data
    // do not call the API too often
    if ((now - last_updated < 10*60*1000) && (Math.floor(now / 1000) < next_update)) {
        return true;
    }

    if (id) {
        const loot_level = getLootLevel(id);
        const hosp_out = data.hosp_out && data.hosp_out[id] || data.npcs && data.npcs[id] && data.npcs[id].hosp_out;
        if (!loot_level || !hosp_out || getDesiredLootLevelTs(data, id) * 1000 < now) {
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
        let data = await call_api(YATA_API_URL);
        if (!data) {
            data = await call_api(ATTACK_TIMER_API_URL);
        }
        if (data) {
            GM_setValue('cached_data', JSON.stringify(data));
            GM_setValue('last_updated', new Date().getTime());
        }
    }

    const cached_data = JSON.parse(GM_getValue('cached_data'));
    if (cached_data.error) {
        console.error(`YATA API error: code=${cached_data.error.code} error=${cached_data.error.error}`);
        return -1;
    }
    // no data on the id
    const hosp_out = data.hosp_out && data.hosp_out[id] || data.npcs && data.npcs[id] && data.npcs[id].hosp_out;
    if (!hosp_out) {
        return -1;
    }
    // timestamp of desired loot level
    return getDesiredLootLevelTs(cached_data, id);
}

async function getAllTimings() {
    if (!isCachedDataValid()) {
        log('Calling the API');
        let data = await call_api(YATA_API_URL);
        if (!data) {
            data = await call_api(ATTACK_TIMER_API_URL);
        }
        if (data) {
            GM_setValue('cached_data', JSON.stringify(data));
            GM_setValue('last_updated', new Date().getTime());
        }
    }

    const cached_data = JSON.parse(GM_getValue('cached_data'));
    if (cached_data.error) {
        console.error(`YATA API error: code=${cached_data.error.code} error=${cached_data.error.error}`);
        return '';
    }
    return cached_data;
}

function hideTimers(hide, yataData, sidebar = true) {
    const hospOutDataExists = (id) => yataData.hosp_out && yataData.hosp_out[id] || yataData.npcs && yataData.npcs[id] && yataData.npcs[id].hosp_out;
    log(yataData);
    if (sidebar) {
        Object.values(NPCS).forEach(npc => (hide || !hospOutDataExists(npc.id)) ? $(`#npcTimer${npc.id}`).hide() : $(`#npcTimer${npc.id}`).show());
        hide ? $('#npcTimerSideScheduledAttack').hide() : $('#npcTimerSideScheduledAttack').show();
        $('#showHideTimers').text(`[${hide ? 'show' : 'hide'}]`);
    } else {
        Object.values(NPCS).forEach(npc => (hide || !hospOutDataExists(npc.id)) ? $(`#npcTimerTop${npc.id}`).hide() : $(`#npcTimerTop${npc.id}`).show());
        hide ? $('#npcTimerTopScheduledAttack').hide() : $('#npcTimerTopScheduledAttack').show();
        $('#showHideTopbarTimers').html(`[${hide ? 'show NPC timers' : 'hide'}]`);
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

const newsContainerId = 'header-swiper-container';
const lightTextColor = '#aaa';
const lightLinkColor = '#00a9f8';
const darkTextColor = 'var(--default-color)';
const darkLinkColor = 'var(--default-blue-color)';

const isMobile = () => $('#tcLogo').height() < 50;
const addContentPadding = (add) => $('#mainContainer > div.content-wrapper').css('padding-top', add ? '10px' : '0px');
const setTopbarPadding = (pad) => $('#topbarNpcTimers').css('padding-top', pad);

function addNpcTimers(data) {
    if (!data)
        return;

    const getLl = (elapsed => (elapsed < TIMINGS[TIMINGS.length - 1]) ? ROMAN[TIMINGS.findIndex(t => elapsed < t) - 1] : ROMAN[ROMAN.length - 1]);

    log('Adding NPC Timers for:')
    log(NPCS);
    if (SIDEBAR_TIMERS && $('#sidebarNpcTimers').size() < 1) {
        let div = '<hr class="delimiter___neME6"><div id="sidebarNpcTimers"><span style="font-weight: 700;">NPC Timers</span><a id="showHideTimers" class="t-blue show-hide">[hide]</a>';
        if (ATTACK_TIMER) {
            div += '<p style="line-height: 20px; text-decoration: none;" id="npcTimerSideScheduledAttack">Attack in<span style="float: right;"></span></p>';
        }
        Object.keys(NPCS).forEach(name => {
            div += `<p style="line-height: 20px; text-decoration: none;" id="npcTimer${NPCS[name].id}"><a class="t-blue href desc" style="display: inline-block;" href="/loader.php?sid=attack&user2ID=` +
                `${NPCS[name].id}">${name}</a><span style="float: right;"></span></p>`;
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
        let div = '<div id="topbarNpcTimers" class="container" style="line-height: 28px; z-index: 1; position: relative;"><span style="font-weight: 700;">' +
            '<a id="showHideTopbarTimers" class="t-blue href desc" style="cursor: pointer; display: inline-block; margin-right: 10px;">[hide]</a></span>';

        if (ATTACK_TIMER) {
            const pistolImg = '<img class="lazy" src="https://emojiguide.com/wp-content/uploads/platform/gmail/43450.png" alt="Attack scheduled" title="Attack scheduled" style="width: 15px; height: 15px; display: inline-block; vertical-align: text-bottom">';
            div += `<span id="npcTimerTopScheduledAttack">${pistolImg} <span style="text-decoration: none; display: inline-block; width: ${isMobile() ? 50 : 65}px;"></span></span>`;
        }

        Object.keys(NPCS).forEach(name => {
            div += `<span style="text-decoration: none;" id="npcTimerTop${NPCS[name].id}"><a class="t-blue href desc" style="display: inline-block;" href="/loader.php?sid=attack&user2ID=` +
                `${NPCS[name].id}">${name}:&nbsp;</a><span style="display: inline-block; width: ${isMobile() ? 50 : 65}px;"></span></span>`;
        });

        div += '</div>';

        if ($('div.header-wrapper-bottom').find('div.container').size() > 0) {
            // announcement
            $('div.header-wrapper-bottom').find('div.container').append(div);
            const isNewsTickerDisplayed = $(`#${newsContainerId}`).size() > 0;
            $('#topbarNpcTimers').css('color', isNewsTickerDisplayed ? darkTextColor : lightTextColor);
            $('#topbarNpcTimers').find('a').css('color', isNewsTickerDisplayed ? darkLinkColor : lightLinkColor);
            addContentPadding(isNewsTickerDisplayed);
        } else {
            $('div.header-wrapper-bottom').prepend(div);
            $('#topbarNpcTimers').find('a').css('color', '#069');
        }
        $('#showHideTopbarTimers').on('click', function () {
            const hide = $('#showHideTopbarTimers').text() == '[hide]';
            GM_setValue('hideTopbarTimers', hide);
            hideTimers(hide, data, false);
        });
        // phone or desktop mode
        $('#topbarNpcTimers').find('span').first().css('padding-left', isMobile() ? '4px' : '190px');
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
        const hosp_out = data.hosp_out && data.hosp_out[id] || data.npcs && data.npcs[id] && data.npcs[id].hosp_out;
        const pId = '#npcTimer' + id;
        const spanId = '#npcTimerTop' + id;
        if (hosp_out) {
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
                        const elapsed = Math.floor(now / 1000) - hosp_out;
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
                        const elapsed = Math.floor(now / 1000) - hosp_out;
                        text = elapsed < 0 ? 'Hosp' : (isMobile() ? `LL ${getLl(elapsed)}` : `Loot lvl ${getLl(elapsed)}`);
                    } else {
                        text = isMobile() ? formatTimeSec(left) : formatTimeSecWithLettersShort(left);
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

/* Attack Timer */

const ATTACK_TIMER_API_DELAY = 60 * 1000;
let displayAttackTimer = -1;

function formatTimeTorn(ts) {
    const date = new Date(ts);
    return `${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)} - ${pad(date.getUTCDate(), 2)}/${pad(date.getUTCMonth() + 1, 2)}/${date.getUTCFullYear()} TCT`;
}

async function getAttackTime() {
    const data = await call_api(ATTACK_TIMER_API_URL);
    log(`getAttackTime: ${JSON.stringify(data)}`);
    const attackTs = data && data.time && data.time.clear ? data.time.clear * 1000 : 0;
    GM_setValue('attack_ts_cached', attackTs);
    GM_setValue('attack_ts_last_updated', new Date().getTime());
}

async function addScheduledAttackTimer() {
    const now = new Date().getTime();
    const lastUpdated = GM_getValue('attack_ts_last_updated');
    let attackTs = GM_getValue('attack_ts_cached');

    if (!attackTs || !lastUpdated || now - lastUpdated >= ATTACK_TIMER_API_DELAY) {
        log('Calling attack timer API');
        await getAttackTime();
    }

    setInterval(async () => {
        log('Calling attack timer API, timer');
        await getAttackTime();
        startDisplayingScheduledAttack();
    }, ATTACK_TIMER_API_DELAY);

    startDisplayingScheduledAttack();

    attackTs = GM_getValue('attack_ts_cached');
    $('#npcTimerTopScheduledAttack').find('img').attr('title', attackTs ? `Attack scheduled for ${formatTimeTorn(attackTs)}` : 'Attack scheduled');
    $('#npcTimerSideScheduledAttack').attr('title', attackTs ? `Attack scheduled for ${formatTimeTorn(attackTs)}` : '');
}

function startDisplayingScheduledAttack() {
    if (displayAttackTimer > -1) {
        clearInterval(displayAttackTimer);
    }

    displayAttackTimer = setInterval(() => {
        const attackTs = GM_getValue('attack_ts_cached');
        const due = new Date(attackTs);
        const now = new Date().getTime();
        const left = due - now;
        if (SIDEBAR_TIMERS) {
            const span = $('#npcTimerSideScheduledAttack').find('span');
            const text = left < 0 ? 'N/A' : formatTimeSecWithLetters(left);
            $('#npcTimerSideScheduledAttack').find('span').text(text);
            if (text !== 'N/A') maybeChangeColors(span, left);
        }
        if (TOPBAR_TIMERS) {
            const span = $('#npcTimerTopScheduledAttack').find('span');
            const text = left < 0 ? 'N/A' : (isMobile() ? formatTimeSec(left) : formatTimeSecWithLettersShort(left));
            $('#npcTimerTopScheduledAttack').find('span').text(text);
            if (text !== 'N/A') maybeChangeColors(span, left);
        }
    }, 1000);
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

    const maybeAddTimers = () => {
        if (SIDEBAR_TIMERS && $('#sidebar').size() > 0 || TOPBAR_TIMERS && $('div.header-wrapper-bottom').size() > 0) {
            getAllTimings().then(data => addNpcTimers(data));
            if (ATTACK_TIMER) {
                addScheduledAttackTimer();
            }
        }
    };
    maybeAddTimers();
    // try again to handle new tab case
    setTimeout(maybeAddTimers, 1000);
})();

function log(data) {
    if (LOGGING_ENABLED) console.log(data)
}

// News ticker observer
const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        for (const node of mutation.addedNodes) {
            if ($(node).attr('id') === newsContainerId) {
                $('#topbarNpcTimers').css('color', darkTextColor);
                $('#topbarNpcTimers').find('a').css('color', darkLinkColor);
                addContentPadding(true);
                // move the topbar down in mobile mode if news ticker is enabled
                setTopbarPadding(isMobile() ? $('#sidebarroot').height() : 0);
            }
        }
        for (const node of mutation.removedNodes) {
            if ($(node).attr('id') === newsContainerId) {
                $('#topbarNpcTimers').css('color', lightTextColor);
                $('#topbarNpcTimers').find('a').css('color', lightLinkColor);
                addContentPadding(false);
                setTopbarPadding(0);
            }
        }
    });
});

observer.observe(document.getElementById('header-root'), { subtree: true, childList: true, characterData: false, attributes: false, attributeOldValue: false });
