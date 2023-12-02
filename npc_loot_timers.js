// ==UserScript==
// @name         Torn: Loot Timers
// @namespace    lugburz.show_timer_on_npc_profile
// @version      1.0
// @description  Displays NPC loot data on profiles, the sidebar, and at the top of the page.
// @author       Lugburz, Lazerpent
// @match        https://www.torn.com/*
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/npc_profile_loot_timer.user.js
// @downloadURL  https://github.com/f2404/torn-userscripts/raw/master/npc_profile_loot_timer.user.js
// @connect      api.lzpt.io
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

/*
    Below are the configuration options. Change these to match your preferences. All options default true

    SIDEBAR_TIMERS: If you want to see the timers in the sidebar
    TOPBAR_TIMERS: If you want to see the timers in the topbar
    CHANGE_COLOR: If you want the timer to change color as it gets close to zero
 */

const SIDEBAR_TIMERS = true;
const TOPBAR_TIMERS = true;
const CHANGE_COLOR = true;

// --- END CONFIGURATION --- //

GM_addStyle(`
  .npc_orange-timer {
    color: orange;
  }
  
  .npc_red-timer {
    color: red;
  }
   
  .npc_green-timer {
    color: green;
  }
  
  .npc_show-hide {
    color: #069;
    text-decoration: none;
    cursor: pointer;
    float: right;
    -webkit-transition: color .2s ease;
    -o-transition: color .2s ease;
    transition: color .2s ease;
  }
  
  .npc_link {
    display: inline-block;
    text-decoration-color: black !important;
    text-decoration-thickness: 2px !important;
  }
`);

const ROMAN = [null, 'I', 'II', 'III', 'IV', 'V'];
const TIMINGS = [-1, 0, 30, 90, 210, 450].map(i => i * 60);
const SHORT_NAME = name => {
  return {
    'Fernando': 'Nando', 'Easter Bunny': 'Bunny'
  }[name] || name;
};

const LOGGING_ENABLED = false;

function log(data) {
  if (LOGGING_ENABLED) console.log(data)
}

async function getData() {
  try {
    const str_data = GM_getValue('cached_data');
    const last_updated = GM_getValue('last_updated');

    const data = JSON.parse(str_data);

    const now = new Date().getTime();

    const noClear = data.time.clear === 0 && !data.time.reason;
    const pastClear = now / 1000 > data.time.clear;
    const overOneMinute = now - last_updated > 60 * 1000;
    const overFifteenMinutes = now - last_updated >= 15 * 60 * 1000;

    const shouldRequest = overOneMinute && (noClear || pastClear) || overFifteenMinutes;
    if (!shouldRequest) {
      return data;
    }
  } catch (e) {
  }

  log('Calling API');

  return await new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET', url: 'https://api.lzpt.io/loot/', headers: {
        'Content-Type': 'application/json'
      }, onload: (response) => {
        try {
          let data = JSON.parse(response.responseText);
          GM_setValue('cached_data', JSON.stringify(data));
          GM_setValue('last_updated', new Date().getTime());

          resolve(data);
        } catch (err) {
          GM_setValue('last_updated', 0);
          reject(err);
        }
      }, onerror: (err) => {
        GM_setValue('last_updated', 0);
        reject(err);
      }
    });
  });
}

function hideTimers(hide, sidebar) {
  const bar = $(`#npc${sidebar ? 'Side' : 'Top'}barData`);
  hide ? bar.hide() : bar.show();
  $(`#showHide${sidebar ? 'Side' : 'Top'}barTimers`).text(`[${hide ? sidebar ? 'show' : 'snow NPC timers' : 'hide'}]`);
}

function maybeChangeColors(span, time, level = 3, active = true) {
  let color = '';
  if (level < 4) {
    if (time < 5 * 60) {
      color = 'red';
    } else if (time < 10 * 60) {
      color = 'orange';
    }
  } else if (level >= 4) {
    color = 'green';
  }

  if (CHANGE_COLOR && active && color) {
    $(span).addClass(`npc_${color}-timer`);
  } else {
    $(span).removeClass('npc_orange-timer npc_red-timer npc_green-timer');
  }
}

function process(id, data) {
  if (!data.npcs[id]) {
    return;
  }

  let x = setInterval(function () {
    const now = Math.floor(new Date().getTime() / 1000);
    const elapsedTime = now - data.npcs[id].hosp_out;
    const currentLevel = elapsedTime < TIMINGS[5] ? TIMINGS.findIndex(t => elapsedTime < t) - 1 : 5;
    const remaining = elapsedTime < TIMINGS[4] ? TIMINGS[4] - elapsedTime : TIMINGS[5] - elapsedTime;

    if (remaining < 0) {
      clearInterval(x);
      return;
    }

    const status = $('div.profile-status').find('div.profile-container').find('div.description');
    const subDesc = status.find('span.sub-desc');
    let subHtml = $(subDesc).html();

    if (subHtml) {
      const n = subHtml.indexOf('(');
      subHtml = subHtml.substring(0, n !== -1 ? n - 1 : subHtml.length);

      let location = 0;
      for (const l of data.order) {
        if (data.npcs[l].next) {
          location++;
        }
        if (l === id) {
          break;
        }
      }
      if (currentLevel !== 5) {
        subDesc.html(`${subHtml} (Loot Level ${ROMAN[currentLevel === 4 ? 5 : 4]} in ${formatCountdown(remaining)})`);
      }

      if (data.time.clear > now && data.npcs[id].next) {
        subDesc.attr('title', `Attack ${location} at ${formatTornTime(data.time.clear)}`);
      } else if (data.time.attack) {
        subDesc.attr('title', 'Attack Right Now');
      } else if (data.time.reason) {
        subDesc.attr('title', "Attack resumes after " + data.time.reason);
      } else {
        subDesc.attr('title', `Attack Not Scheduled`);
      }
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
// noinspection JSJQueryEfficiency
const setTopbarPadding = (pad) => $('#topbarNpcTimers').css('padding-top', pad);

function addNpcTimers(data) {
  if (!data) {
    return;
  }

  log('Adding NPC Timers')
  if (SIDEBAR_TIMERS && $('#sidebarNpcTimers').size() < 1) {
    const npc_html = data.order.map(id => [id, data.npcs[id].name]).map(([id, name]) => (`
        <p style='line-height: 20px; text-decoration: none;' id='npcTimerSidebar${id}'>
          <a class='t-blue href desc npc_link' href='/loader.php?sid=attack&user2ID=${id}'>${name}</a>
          <span style='float: right;'></span>
        </p>
    `)).join('');

    const div = `
      <hr class='delimiter___neME6'>
      <div id='sidebarNpcTimers'>
        <span style='font-weight: 700;'>NPC Timers</span>
        <a id='showHideSidebarTimers' class='t-blue npc_show-hide'>[hide]</a>
        <span id='npcSidebarData'>
          <p style='line-height: 20px; text-decoration: none;' id='npcTimerSidebarScheduledAttack'>
            Attack in<span style='float: right;'></span>
          </p>
          ${npc_html}
        </span>
      </div>
    `;


    $('#sidebar').find('div[class^=toggle-content__]').find('div[class^=content___]').append(div);

    $('#showHideSidebarTimers').on('click', function () {
      const hide = $('#showHideSidebarTimers').text() === '[hide]';
      GM_setValue('hideSidebarTimers', hide);
      hideTimers(hide, true);
    });
  }

  // noinspection JSJQueryEfficiency
  if (TOPBAR_TIMERS && $('#topbarNpcTimers').size() < 1) {
    const npc_html = data.order.map(id => [id, data.npcs[id].name]).map(([id, name]) => (`
        <span style='text-decoration: none;' id='npcTimerTopbar${id}'>
            <a class='t-blue href desc npc_link ' style='display: inline-block; text-decoration-color: black; text-decoration-thickness: 2px' href='/loader.php?sid=attack&user2ID=${id}'>${SHORT_NAME(name)}</a>:&nbsp;
            <span style='display: inline-block; width: ${isMobile() ? 50 : 65}px;'></span>
          </span>
    `)).join('');

    const div = `
      <div id='topbarNpcTimers' class='container' style='line-height: 28px; z-index: 1; position: relative;'>
        <span style='font-weight: 700;'>
          <a id='showHideTopbarTimers' class='t-blue href desc' style='cursor: pointer; display: inline-block; margin-right: 10px;text-shadow: none;'>[hide]</a>
        </span>
        <span id='npcTopbarData'>
          <span id='npcTimerTopbarScheduledAttack'>
            <img class='lazy' src='https://emojiguide.com/wp-content/uploads/platform/gmail/43450.png' alt='Attack scheduled' title='Attack scheduled' style='width: 15px; height: 15px; display: inline-block; vertical-align: text-bottom'>
            <span style='text-decoration: none; display: inline-block; width: ${isMobile() ? 50 : 65}px;'></span>
          </span>
          ${npc_html}
        </span>
      </div>
    `;

    $('div.header-wrapper-bottom').find('div.container').append(div);
    const isNewsTickerDisplayed = $(`#${newsContainerId}`).size() > 0;
    const topbarTimers = $('#topbarNpcTimers');
    topbarTimers.css('color', isNewsTickerDisplayed ? darkTextColor : lightTextColor);
    topbarTimers.find('a').css('color', isNewsTickerDisplayed ? darkLinkColor : lightLinkColor);
    addContentPadding(isNewsTickerDisplayed);

    $('#showHideTopbarTimers').on('click', function () {
      const hide = $('#showHideTopbarTimers').text() === '[hide]';
      GM_setValue('hideTopbarTimers', hide);
      hideTimers(hide, false);
    });

    topbarTimers.find('span').first().css('padding-left', isMobile() ? '4px' : '190px');
  }

  if (SIDEBAR_TIMERS) {
    const hide = GM_getValue('hideSidebarTimers');
    hideTimers(hide, true);
  }
  if (TOPBAR_TIMERS) {
    const hide = GM_getValue('hideTopbarTimers');
    hideTimers(hide, false);
  }

  if (!setup) {
    setup = true;
    renderTimes().catch(err => {
      console.error(err);
    });
  }
}

let setup = false;

async function renderTimes() {
  const start = new Date().getTime();
  const data = await getData();
  const now = Math.floor(start / 1000);

  data.order.forEach(id => {
    const sidebar = `#npcTimerSidebar${id}`;
    const topbar = `#npcTimerTopbar${id}`;

    const elapsedTime = now - data.npcs[id].hosp_out;
    const remaining = elapsedTime < TIMINGS[4] ? TIMINGS[4] - elapsedTime : TIMINGS[5] - elapsedTime;
    const currentLevel = elapsedTime < TIMINGS[5] ? TIMINGS.findIndex(t => elapsedTime < t) - 1 : 5;

    const clearStatus = data.npcs[id].next ? 'none' : 'line-through';

    if (SIDEBAR_TIMERS) {
      const div = $(sidebar);
      const span = div.find('span');
      let text;
      if (currentLevel >= 4) {
        text = elapsedTime < 0 ? 'Hosp' : `Loot level ${ROMAN[currentLevel]}`;
      } else {
        text = formatCountdown(remaining);
      }
      $(span).text(text);
      maybeChangeColors(span, remaining, currentLevel);

      div.find('a').first().css('text-decoration', clearStatus);
    }
    if (TOPBAR_TIMERS) {
      const div = $(topbar);
      const span = div.find('span');
      let text;
      if (currentLevel >= 4) {
        text = elapsedTime < 0 ? 'Hosp' : (isMobile() ? `LL ${ROMAN[currentLevel]}` : `Loot lvl ${ROMAN[currentLevel]}`);
      } else {
        text = isMobile() ? formatCountdown(remaining, 'minimal') : formatCountdown(remaining, 'short');
      }
      $(span).text(text);
      maybeChangeColors(span, remaining, currentLevel);

      div.find('a').first().css('text-decoration', clearStatus);
    }
  });

  const remainingTime = data.time.clear - now;
  const scheduled = remainingTime > 0;

  if (SIDEBAR_TIMERS) {
    const sidebar = $('#npcTimerSidebarScheduledAttack');
    const span = sidebar.find('span');
    const text = scheduled ? formatCountdown(remainingTime) : data.time.attack ? 'NOW' : data.time.reason ? `${data.time.reason}` :'N/A';
    sidebar.find('span').text(text);

    maybeChangeColors(span, remainingTime, undefined, scheduled || data.time.attack);

    sidebar.attr('title', scheduled ? `Attack scheduled for ${formatTornTime(data.time.clear)}` : data.time.attack ? 'Attack now' : data.time.reason ? `Attacking resumes after ${data.time.reason}` :'No attack scheduled');
  }
  if (TOPBAR_TIMERS) {
    const topbar = $('#npcTimerTopbarScheduledAttack');
    const span = topbar.find('span');
    const text = scheduled ? (isMobile() ? formatCountdown(remainingTime, 'minimal') : formatCountdown(remainingTime, 'short')) : data.time.attack ? 'NOW' : data.time.reason ? `On Hold` :'N/A';
    topbar.find('span').text(text);

    maybeChangeColors(span, remainingTime, undefined, scheduled || data.time.attack);

    topbar.attr('title', scheduled ? `Attack scheduled for ${formatTornTime(data.time.clear)}` : data.time.attack ? 'Attack now' : data.time.reason ? `Attacking resumes after ${data.time.reason}` : 'No attack scheduled');
  }

  setTimeout(renderTimes, Math.max(100, start + 1000 - new Date().getTime()));
}


(function () {
  'use strict';

  if ($(location).attr('href').includes('profiles.php')) {
    try {
      const profileId = RegExp(/XID=(\d+)/).exec($(location).attr('href'))[1];
      getData().then(process.bind(null, parseInt(profileId)));
    } catch (err) {
      console.error(err);
    }
  }

  const maybeAddTimers = () => {
    if (SIDEBAR_TIMERS && $('#sidebar').size() > 0 || TOPBAR_TIMERS && $('div.header-wrapper-bottom').size() > 0) {
      getData().then(data => addNpcTimers(data));
    }
  };
  maybeAddTimers();

  // try again to handle new tab case
  setTimeout(maybeAddTimers, 1000);
})();

// News ticker observer
const observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    const topbarNpcTimers = $('#topbarNpcTimers');
    for (const node of mutation.addedNodes) {
      if ($(node).attr('id') === newsContainerId) {
        topbarNpcTimers.css('color', darkTextColor);
        topbarNpcTimers.find('a').css('color', darkLinkColor);
        addContentPadding(true);

        setTopbarPadding(isMobile() ? $('#sidebarroot').height() : 0);
      }
    }
    for (const node of mutation.removedNodes) {
      if ($(node).attr('id') === newsContainerId) {
        topbarNpcTimers.css('color', lightTextColor);
        topbarNpcTimers.find('a').css('color', lightLinkColor);
        addContentPadding(false);
        setTopbarPadding(0);
      }
    }
  });
});

observer.observe(document.getElementById('header-root'), {
  subtree: true, childList: true, characterData: false, attributes: false, attributeOldValue: false
});


// Helper Functions

function formatTornTime(time) {
  const date = new Date(time * 1000);
  return `${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)} - ${pad(date.getUTCDate(), 2)}/${pad(date.getUTCMonth() + 1, 2)}/${date.getUTCFullYear()} TCT`;
}

function formatCountdown(sec, mode = 'long') {
  const hours = Math.floor((sec % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((sec % (60 * 60)) / 60);
  const seconds = Math.floor(sec % 60);

  switch (mode) {
    case 'long':
      return (hours > 0 ? hours + 'h ' : '') + (hours > 0 || minutes > 0 ? minutes + 'min ' : '') + seconds + 's';
    case 'short':
      return hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}min ${seconds}s` : `${seconds}s`;
    case 'minimal':
      return (hours > 0 ? hours + ':' : '') + (hours > 0 || minutes > 0 ? pad(minutes, 2) + ':' : '') + pad(seconds, 2);
  }
}

function pad(num, size) {
  return String(num).padStart(size, '0');
}