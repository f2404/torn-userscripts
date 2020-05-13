// ==UserScript==
// @name         Torn: Loot timer on NPC profile
// @namespace    lugburz.show_timer_on_npc_profile
// @version      0.2.0
// @description  Add a countdown timer to desired loot level on the NPC profile page and the sidebar.
// @author       Lugburz
// @match        https://www.torn.com/*
// @require      https://github.com/f2404/torn-userscripts/raw/2be3e35359f9205eccf9c75ba241facf75a0f7d9/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/npc_profile_loot_timer.user.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// Desired loot lebel to track (4 by default)
const LOOT_LEVEL = 4;

// Whether or not to show timer in sidebar
const SIDEBAR_TIMERS = true;



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

async function getTimings(id) {
    const data = await yata_api();
    if (data.error) {
        console.log('YATA API error');
        return -1;
    }
    // no data on the id
    if (!data[id]) {
        return -1;
    }
    // time till desired loot level
    return data[id].timings[LOOT_LEVEL].ts;
}

async function getAllTimings() {
    const data = await yata_api();
    if (data.error) {
        console.log('YATA API error');
        return '';
    }
    return data;
}

function process(ts) {
    if (ts < 0)
        return;

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

    if ($('#sidebarNpcTimers').size() < 1) {
        let div = '<hr class="delimiter___neME6"><div id="sidebarNpcTimers"><p style="line-height: 20px; text-decoration: none;"><span style="font-weight: 700;">NPC Timers</span></p>';
        for (let i = 0; i < IDS.length; i++) {
            div += '<p style="line-height: 20px; text-decoration: none;" id="npcTimer' + IDS[i] + '"><a class="t-blue href desc" style="display:inline-block; width: 52px;" href="/profiles.php?XID=' +
                   IDS[i] + '">' + NAMES[i] + ': </a><span></span></p>';
        }
        div += '</div>';
        $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]').append(div);
        //$(div).insertBefore($('#sidebar').find('hr[class^=delimiter__]').first());
    }

    for (let i = 0; i < IDS.length; i++) {
        const id = IDS[i];
        const pId = '#npcTimer' + id;
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

                // Display the result
                const span = $(pId).find('span');
                $(span).text(formatTimeSecWithLetters(left));
            }, 1000);
        } else {
            $(pId).hide();
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
    if (SIDEBAR_TIMERS && $('#sidebar').size() > 0) {
        getAllTimings().then(data => addNpcTimers(data));
    }
})();
