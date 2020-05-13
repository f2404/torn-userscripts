// ==UserScript==
// @name         Torn: Loot timer on NPC profile
// @namespace    lugburz.show_timer_on_npc_profile
// @version      0.1.3
// @description  Add a countdown timer to desired loot level on the NPC profile page.
// @author       Lugburz
// @match        https://www.torn.com/profiles.php*
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/npc_profile_loot_timer.user.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// Desired loot lebel to track (4 by default)
const LOOT_LEVEL = 4;

const IDs = [4, 10, 15, 19]; // Duke, Scrooge, Leslie, Jimmy
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
    if (data.error)
        return 'YATA API error';
    // no data on the id
    if (!data[id])
        return -1;
    // time till desired loot level
    return data[id].timings[LOOT_LEVEL].ts;
}

function process(ts) {
    if (ts < 0)
        return;

    // ts is s, Date is ms
    const due = new Date(ts * 1000);

    var x = setInterval(function() {
        const now = new Date().getTime();
        const left = due - now;
        if (left < 0) {
            clearInterval(x);
            return;
        }

        // Time calculations for days, hours, minutes and seconds
        const hours = Math.floor((left % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((left % (1000 * 60)) / 1000);

        // Display the result
        const span = $('#profileroot').find('div.profile-status').find('div.profile-container').find('div.description').find('span.sub-desc');
        let html = $(span).html();
        const n = html.indexOf('(');
        html = html.substring(0, n != -1 ? n-1 : html.length);
        $(span).html(html + " (Till loot level " + ROMAN[LOOT_LEVEL-1] + ": " + (hours > 0 ? hours + "h " : '') +
                     (minutes > 0 ? minutes + "m " : '') + seconds + "s)");
    }, 1000);
}

(function() {
    'use strict';

    // Your code here...
    const profileId = RegExp(/XID=(\d+)/).exec($(location).attr('href'))[1];
    if (IDs.includes(Number(profileId))) {
        getTimings(profileId).then(ts => process(ts));
    }
})();
