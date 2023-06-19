// ==UserScript==
// @name         Torn: Loot timer on NPC profile
// @namespace    lugburz.show_timer_on_npc_profile
// @version      1.0
// @description  Displays NPC loot data on profiles, the sidebar, and at the top of the page.
// @author       Lugburz, Lazerpent
// @match        https://www.torn.com/*
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/npc_profile_loot_timer.user.js
// @downloadURL  https://github.com/f2404/torn-userscripts/raw/master/npc_profile_loot_timer.user.js
// @connect      yata.yt
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
    'Fernando': 'Nando',
    'Easter Bunny': 'Bunny'
  }[name] || name;
};

const LOGGING_ENABLED = false;
function log(data) {
  if (LOGGING_ENABLED) console.log(data)
}

const updateData = async () => {
  try {
    const str_data = GM_getValue('cached_data');
    const last_updated = GM_getValue('last_updated');

    const data = JSON.parse(str_data);

    const now = new Date().getTime();
    if (now - last_updated < 15 * 60 * 1000 && ((data.time.clear !== 0 && data.time.clear >= now / 1000) || now - last_updated <= 60 * 1000)) {
      return data;
    }
  } catch (e) {
  }

  log('Calling API');

  return await new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: 'https://api.lzpt.io/loot/',
      headers: {
        'Content-Type': 'application/json'
      },
      onload: (response) => {
        try {
          let data = JSON.parse(response.responseText);
          GM_setValue('cached_data', JSON.stringify(data));
          GM_setValue('last_updated', new Date().getTime());

          resolve(data);
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

function hideTimers(hide, sidebar) {
  const bar = $(`#npc${sidebar ? 'Side' : 'Top'}barData`);
  hide ? bar.hide() : bar.show();
  $(`#showHide${sidebar ? 'Side' : 'Top'}barTimers`).text(`[${hide ? sidebar ? 'show' : 'snow NPC timers' : 'hide'}]`);
}

function maybeChangeColors(span, left) {
  if (CHANGE_COLOR) {
    if (left < 5 * 60) {
      $(span).addClass('npc_red-timer');
    } else if (left < 10 * 60) {
      $(span).addClass('npc_orange-timer');
    } else {
      $(span).removeClass('npc_orange-timer');
      $(span).removeClass('npc_red-timer');
    }
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

    const span = $('div.profile-status').find('div.profile-container').find('div.description').find('span.sub-desc');
    let html = $(span).html();
    if (html && currentLevel !== 5) {
      const n = html.indexOf('(');
      html = html.substring(0, n !== -1 ? n - 1 : html.length);
      $(span).html(`${html} (Till loot level ${ROMAN[currentLevel === 4 ? 5 : 4]}: ${formatTime(remaining)})`);
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
  if (!data)
    return;

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

  setInterval(() => {
    const now = Math.floor(new Date().getTime() / 1000);

    data.order.forEach(id => {
      const sidebar = `#npcTimerSidebar${id}`;
      const topbar = `#npcTimerTopbar${id}`;

      const elapsedTime = now - data.npcs[id].hosp_out;
      const remaining = elapsedTime < TIMINGS[4] ? TIMINGS[4] - elapsedTime : TIMINGS[5] - elapsedTime;
      const currentLevel = elapsedTime < TIMINGS[5] ? TIMINGS.findIndex(t => elapsedTime < t) - 1 : 5;

      if (SIDEBAR_TIMERS) {
        const div = $(sidebar);
        const span = div.find('span');
        let text;
        if (currentLevel >= 4) {
          text = elapsedTime < 0 ? 'Hosp' : `Loot level ${currentLevel}`;
        } else {
          text = formatTime(remaining);
        }
        $(span).text(text);
        maybeChangeColors(span, remaining);

        div.find('a').first().css('text-decoration', data.npcs[id].clear ? 'none' : 'line-through');
      }
      if (TOPBAR_TIMERS) {
        const div = $(topbar);
        const span = div.find('span');
        let text;
        if (currentLevel >= 4) {
          text = elapsedTime < 0 ? 'Hosp' : (isMobile() ? `LL ${currentLevel}` : `Loot lvl ${currentLevel}`);
        } else {
          text = isMobile() ? formatTime(remaining, 'minimal') : formatTime(remaining, 'short');
        }
        $(span).text(text);
        maybeChangeColors(span, remaining);

        div.find('a').first().css('text-decoration', data.npcs[id].clear ? 'none' : 'line-through');
      }
    });

    const remainingTime = data.time.clear - now;
    if (SIDEBAR_TIMERS) {
      const sidebar = $('#npcTimerSidebarScheduledAttack');
      const span = sidebar.find('span');
      const text = remainingTime < 0 ? 'N/A' : formatTime(remainingTime);
      sidebar.find('span').text(text);

      const scheduled = text !== 'N/A';
      if (scheduled) {
        maybeChangeColors(span, remainingTime);
      }
      sidebar.attr('title', scheduled ? `Attack scheduled for ${formatTornTime(data.time.clear)}` : '');
    }
    if (TOPBAR_TIMERS) {
      const topbar = $('#npcTimerTopbarScheduledAttack');
      const span = topbar.find('span');
      const text = remainingTime < 0 ? 'N/A' : (isMobile() ? formatTime(remainingTime, 'minimal') : formatTime(remainingTime, 'short'));
      topbar.find('span').text(text);

      const scheduled = text !== 'N/A';
      if (text !== 'N/A') {
        maybeChangeColors(span, remainingTime);
      }
      topbar.find('img').attr('title', scheduled ? `Attack scheduled for ${formatTornTime(data.time.clear)}` : 'Attack scheduled');
    }
  }, 1000);
}


(function () {
  'use strict';

  if ($(location).attr('href').includes('profiles.php')) {
    const profileId = RegExp(/XID=(\d+)/).exec($(location).attr('href'))[1];
    updateData().then(process.bind(null, profileId));
  }

  const maybeAddTimers = () => {
    if (SIDEBAR_TIMERS && $('#sidebar').size() > 0 || TOPBAR_TIMERS && $('div.header-wrapper-bottom').size() > 0) {
      updateData().then(data => addNpcTimers(data));
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
  subtree: true,
  childList: true,
  characterData: false,
  attributes: false,
  attributeOldValue: false
});


// Helper Functions

function formatTornTime(time) {
  const date = new Date(time * 1000);
  return `${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)} - ${pad(date.getUTCDate(), 2)}/${pad(date.getUTCMonth() + 1, 2)}/${date.getUTCFullYear()} TCT`;
}

function formatTime(sec, mode = 'long') {
  const hours = Math.floor((sec % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((sec % (60 * 60)) / 60);
  const seconds = Math.floor(sec % 60);

  switch (mode) {
    case 'long':
      return (hours > 0 ? hours + 'h ' : '') + (hours > 0 || minutes > 0 ? minutes + 'min ' : '') + seconds + 's';
    case 'short':
      return hours > 0 ? `${hours}h ${minutes}min` : minutes > 0 ? `${minutes}min ${seconds}s` : `${seconds}s`;
    case 'minimal':
      return (hours > 0 ? hours + ':' : '') + (hours > 0 || minutes > 0 ? pad(minutes, 2) + ':' : '') + pad(seconds, 2);
  }
}

function pad(num, size) {
  return String(num).padStart(size, '0');
}