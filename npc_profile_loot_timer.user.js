// ==UserScript==
// @name         Torn: Loot timer on NPC profile
// @namespace    lugburz.show_timer_on_npc_profile
// @version      0.2.5
// @description  Add a countdown timer to desired loot level on the NPC profile page as well as on the sidebar and the topbar (optionally).
// @author       Lugburz
// @match        https://www.torn.com/*
// @require      https://github.com/f2404/torn-userscripts/raw/410fc2fb1dc4d2f21b90709687b97786641c15af/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/npc_profile_loot_timer.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

// Desired loot level to track (4 by default)
const LOOT_LEVEL = 4;

// Whether or not to show timer in sidebar
const SIDEBAR_TIMERS = true;

// Whether or not to show timer in topbar
const TOPBAR_TIMERS = true;

// Whether or not to change the timer color when it's close to running out
const CHANGE_COLOR = true;



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

const IDS = [4, 10, 15, 19]; // Duke, Scrooge, Leslie, Jimmy
const NAMES = ['Duke', 'Scrooge', 'Leslie', 'Jimmy'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

const yata_api = async () => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest ( {
      method: "GET",
      url: 'https://yata.alwaysdata.net/loot/timings/',
      headers: {
        "Content-Type": "application/json"
      },
      onload: (response) => {
          try {
            const resjson = JSON.parse(response.responseText)
            resolve(resjson)
          } catch(err) {
            reject(err)
          }
      },
      onerror: (err) => {
        reject(err)
      }
    })
  })
}

function isCachedDataValid(id = '') {
    const now = new Date().getTime();
    const str_data = GM_getValue('cached_data');
    let data = '';
    try {
        data = JSON.parse(str_data);
    } catch (e) {
        return false;
    }

    if (id && (!data[id] || data[id].timings[LOOT_LEVEL].ts * 1000 < now)) {
        return false;
    } else if (!id) {
        for (let id in data) {
            if (data[id].timings[LOOT_LEVEL].ts * 1000 < now) {
                return false;
            }
        }
    }
    return true;
}

async function getTimings(id) {
    if (!isCachedDataValid(id)) {
        console.log('Calling YATA id=' + id);
        const data = await yata_api();
        GM_setValue('cached_data', JSON.stringify(data));
    }

    const cached_data = JSON.parse(GM_getValue('cached_data'));
    if (cached_data.error) {
        console.log('YATA API error');
        return -1;
    }
    // no data on the id
    if (!cached_data[id]) {
        return -1;
    }
    // time till desired loot level
    return cached_data[id].timings[LOOT_LEVEL].ts;
}

async function getAllTimings() {
    if (!isCachedDataValid()) {
        console.log('Calling YATA');
        const data = await yata_api();
        GM_setValue('cached_data', JSON.stringify(data));
    }

    const cached_data = JSON.parse(GM_getValue('cached_data'));
    if (cached_data.error) {
        console.log('YATA API error');
        return '';
    }
    return cached_data;
}

function hideSidebarTimers(hide) {
    if (hide) {
        for (let i = 0; i < IDS.length; i++) {
            const id = IDS[i];
            const pId = '#npcTimer' + id;
            $(pId).hide();
        }
        $('#showHideTimers').text('[show]');
    } else {
        for (let i = 0; i < IDS.length; i++) {
            const id = IDS[i];
            const pId = '#npcTimer' + id;
            if (!$(pId).attr('notavail')) $(pId).show();
        }
        $('#showHideTimers').text('[hide]');
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

function process(ts) {
    if (ts < 0) {
        return;
    }

    // ts is s, Date is ms
    const due = new Date(ts * 1000);

    let x = setInterval(function() {
        const now = new Date().getTime();
        const left = due - now;
        if (left < 0) {
            clearInterval(x);
            return;
        }

        // Display the result
        const span = $('#profileroot').find('div.profile-status').find('div.profile-container').find('div.description').find('span.sub-desc');
        let html = $(span).html();
        const n = html.indexOf('(');
        html = html.substring(0, n != -1 ? n-1 : html.length);
        $(span).html(html + " (Till loot level " + ROMAN[LOOT_LEVEL-1] + ": " + formatTimeSecWithLetters(left) + ")");
    }, 1000);
}

function addNpcTimers(data) {
    if (!data) {
        return;
    }

    if (SIDEBAR_TIMERS && $('#sidebarNpcTimers').size() < 1) {
        let div = '<hr class="delimiter___neME6"><div id="sidebarNpcTimers"><span style="font-weight: 700;">NPC Timers</span><a id="showHideTimers" class="show-hide">[hide]</a>';
        for (let i = 0; i < IDS.length; i++) {
            div += '<p style="line-height: 20px; text-decoration: none;" id="npcTimer' + IDS[i] + '"><a class="t-blue href desc" style="display:inline-block; width: 52px;" href="/loader.php?sid=attack&user2ID=' +
                   IDS[i] + '">' + NAMES[i] + ': </a><span></span></p>';
        }
        div += '</div>';
        $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]').append(div);
        //$(div).insertBefore($('#sidebar').find('h2[class^=header__]').eq(1)); // second header
        $('#showHideTimers').on('click', function() {
            const hide = $('#showHideTimers').text() == '[hide]';
            GM_setValue('hideSidebarTimers', hide);
            hideSidebarTimers(hide);
        });
    }

    if (TOPBAR_TIMERS && $('#topbarNpcTimers').size() < 1) {
        let div = '<div id="topbarNpcTimers" style="text-align: center;"><span style="font-weight: 700;">NPC Timers:</span>';
        for (let i = 0; i < IDS.length; i++) {
            div += '<span style="line-height: 20px; text-decoration: none;" id="npcTimerTop' + IDS[i] + '"><a class="t-blue href desc" style="display:inline-block; width: 52px;" href="/loader.php?sid=attack&user2ID=' +
                   IDS[i] + '">' + NAMES[i] + ': </a><span></span></span>';
        }
        div += '</div>';
        if ($('div.header-wrapper-bottom').find('div.container').size() > 0) {
            // announcement
            $('div.header-wrapper-bottom').find('div.container').append(div);
        } else {
            $('div.header-wrapper-bottom').prepend(div);
        }
    }

    if (SIDEBAR_TIMERS) {
        const hide = GM_getValue('hideSidebarTimers');
        hideSidebarTimers(hide);
    }

    for (let i = 0; i < IDS.length; i++) {
        const id = IDS[i];
        const pId = '#npcTimer' + id;
        const spanId = '#npcTimerTop' + id;
        if (data[id]) {
            const name = NAMES[i];
            const ts = data[id].timings[LOOT_LEVEL].ts;

            // ts is s, Date is ms
            const due = new Date(ts * 1000);
            let x = setInterval(function() {
                const now = new Date().getTime();
                const left = due - now;
                if (left < 0) {
                    clearInterval(x);
                    return;
                }

                // Display the results
                if (SIDEBAR_TIMERS) {
                    $(pId).attr('notavail', '');
                    const span = $(pId).find('span');
                    $(span).text(formatTimeSecWithLetters(left));
                    maybeChangeColors(span, left);
                }
                if (TOPBAR_TIMERS) {
                    $(spanId).attr('notavail', '');
                    const span = $(spanId).find('span');
                    $(span).text(formatTimeSecWithLetters(left));
                    maybeChangeColors(span, left);
                }
            }, 1000);
        } else {
            $(pId).attr('notavail', 1);
            $(pId).hide();
            $(spanId).attr('notavail', 1);
            $(spanId).hide();
        }
    }
}

(function() {
    'use strict';

    // Your code here...
    if ($(location).attr('href').includes('profiles.php')) {
        const profileId = RegExp(/XID=(\d+)/).exec($(location).attr('href'))[1];
        if (IDS.includes(Number(profileId))) {
            getTimings(profileId).then(ts => process(ts));
        }
    }
    if (SIDEBAR_TIMERS && $('#sidebar').size() > 0 || TOPBAR_TIMERS && $('div.header-wrapper-bottom').size() > 0) {
        getAllTimings().then(data => addNpcTimers(data));
    }
})();
