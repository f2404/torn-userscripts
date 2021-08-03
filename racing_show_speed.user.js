// ==UserScript==
// @name         Torn: Racing enhancements
// @namespace    lugburz.racing_enhancements
// @version      0.4.1
// @description  Show car's current speed, precise skill, official race penalty, racing skill of others and race car skins.
// @author       Lugburz
// @match        https://www.torn.com/*
// @require      https://github.com/f2404/torn-userscripts/raw/e3bb87d75b44579cdb6f756435696960e009dc84/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/racing_show_speed.user.js
// @connect      racing-skill-sharing.firebaseio.com
// @connect      race-skins.brainslug.nl
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @run-at       document-body
// ==/UserScript==

// Whether to show notifications.
const NOTIFICATIONS = GM_getValue('showNotifChk') != 0;

// Whether to show race result as soon as a race starts.
const SHOW_RESULTS = GM_getValue('showResultsChk') != 0;

// Whether to show current speed.
const SHOW_SPEED = GM_getValue('showSpeedChk') != 0;

// Whether to share racing skill with others (disabled by default).
const SHARE_RS = GM_getValue('shareRacingSkill') > 0;

// Whether to show car skins
const SHOW_SKINS = GM_getValue('showSkinsChk') != 0;

// Domain for racecar skins
const SKIN_AWARDS = 'https://race-skins.brainslug.nl/custom/data';
const SKIN_IMAGE = id => `https://race-skins.brainslug.nl/assets/${id}`;

const userID = getUserIdFromCookie();
var RACE_ID = '*';
var period = 1000;
var last_compl = -1.0;
var x = 0;
var penaltyNotif = 0;

function maybeClear() {
    if (x != 0 ) {
        clearInterval(x);
        last_compl = -1.0;
        x = 0;
    }
}

// Shared racing skill
const FB_URL = 'https://racing-skill-sharing.firebaseio.com/racing_skill_reports/';
const racingSkillCacheByDriverId = new Map();

async function updateDriversList() {
    const driversList = document.getElementById('leaderBoard');
    if (driversList === null) {
        return;
    }

    watchForDriversListContentChanges(driversList);

    const driverIds = getDriverIds(driversList);
    const racingSkills = await getRacingSkillForDrivers(driverIds);
    const racingSkins = await getRacingSkinOwners(driverIds);
    for (let driver of driversList.querySelectorAll('.driver-item')) {
        const driverId = getDriverId(driver);
        if (SHARE_RS && !!racingSkills[driverId]) {
            const skill = racingSkills[driverId].split('+')[0];
            const style = racingSkills[driverId].split('+')[1] || '';
            const nameDiv = driver.querySelector('.name');
            nameDiv.style.position = 'relative';
            nameDiv.insertAdjacentHTML('beforeend', `<span style="position:absolute;right:5px;${style}">${(+skill).toFixed(2)}</span>`);
        }
        if (SHOW_SKINS && !!racingSkins[driverId]) {
            const carImg = driver.querySelector('.car').querySelector('img');
            const carId = carImg.getAttribute('src').replace(/[^0-9]*/g, '');
            if (!!racingSkins[driverId][carId]) {
                carImg.setAttribute('src', SKIN_IMAGE(racingSkins[driverId][carId]));
                if (driverId == userID) skinCarSidebar(racingSkins[driverId][carId]);
            }
        }
    }
}

function watchForDriversListContentChanges(driversList) {
    if (driversList.dataset.hasWatcher !== undefined) {
        return;
    }

    // The content of #leaderBoard is rebuilt periodically so watch for changes:
    new MutationObserver(updateDriversList).observe(driversList, {childList: true});
    driversList.dataset.hasWatcher = 'true';
}

function getDriverIds(driversList) {
    return Array.from(driversList.querySelectorAll('.driver-item')).map(driver => getDriverId(driver));
}

function getDriverId(driverUl) {
    return +driverUl.closest('li').id.substr(4);
}

async function getRacingSkillForDrivers(driverIds) {
    const driverIdsToFetchSkillFor = driverIds.filter(driverId => ! racingSkillCacheByDriverId.has(driverId));
    for (const driverId of driverIdsToFetchSkillFor) {
        const json = await fetchRacingSkillForDrivers(driverId);
        if (json && json != 'null') {
            let skill = null;
            let dateUtc = null;
            /* this is to parse the result that may look like this: [null,{json_object}]
               instead of this: {key: {json_object}} */
            if (Object.keys(json) && Object.keys(json)[0] && json[Object.keys(json)[0]]) {
                skill = json[Object.keys(json)[0]].rs_string;
                dateUtc = Date.parse(json[Object.keys(json)[0]].date_utc + '.000Z');
            } else if (Object.keys(json) && Object.keys(json)[1] && json[Object.keys(json)[1]]) {
                skill = json[Object.keys(json)[1]].rs_string;
                dateUtc = Date.parse(json[Object.keys(json)[1]].date_utc + '.000Z');
            }
            if (skill) {
                // check if skill was updated more than a week ago
                if (dateUtc && (Date.now() - dateUtc > 7*24*60*60*1000)) {
                    skill += '+color:orange';
                }
                racingSkillCacheByDriverId.set(+driverId, skill);
            } else {
                // caching empty results to improve performance
                racingSkillCacheByDriverId.set(+driverId, '');
            }
        } else {
            // caching empty results to improve performance
            racingSkillCacheByDriverId.set(+driverId, '');
        }
    }

    const resultHash = {};
    for (const driverId of driverIds) {
        const skill = racingSkillCacheByDriverId.get(driverId);
        if (!!skill) {
            resultHash[driverId] = skill;
        }
    }
    return resultHash;
}

let _skinOwnerCache = null;
async function getRacingSkinOwners(driverIds) {
    function filterSkins(skins) {
        let result = {};
        for (const driverId of driverIds) {
            if (!!skins && !!skins['*'] && !!skins['*'][driverId]) {
                result[driverId] = skins['*'][driverId];
            }
            if (!!skins && !!skins[RACE_ID] && !!skins[RACE_ID][driverId]) {
                result[driverId] = skins[RACE_ID][driverId];
            }
        }
        return result;
    }
    return new Promise(resolve => {
        // fetching the list once per page load should be enough
        if (!!_skinOwnerCache) return resolve(_skinOwnerCache);
        // fetch and filter the owners
        GM_xmlhttpRequest({
            method: 'GET',
            url: SKIN_AWARDS,
            headers: {'Content-Type': 'application/json'},
            onload: ({responseText}) => {
                _skinOwnerCache = JSON.parse(responseText);
                resolve(_skinOwnerCache);
            }
        });
    }).then(filterSkins);
}

let _skinned = false;
function skinCarSidebar(carSkin) {
    const carSelected = document.querySelector('.car-selected');
    if (!carSelected) return; // fail quietly
    const tornItem = carSelected.querySelector('.torn-item');
    if (!tornItem) return; // fail quietly
    if (tornItem !== _skinned) {
        tornItem.setAttribute('src', SKIN_IMAGE(carSkin));
        tornItem.style.display = 'block';
        tornItem.style.opacity = 1;
        carSelected.querySelector('canvas').style.display = 'none';
        _skinned = tornItem;
    }
}

function getUserIdFromCookie() {
    const userIdString = document.cookie.split(';')
        .map(entry => entry.trim())
        .find(entry => entry.indexOf('uid=') === 0)
        .replace('uid=', '');

    return parseInt(userIdString, 10);
}

function formatDate(date) {
    const month = (+date.getUTCMonth()) + (+1);
    return date.getUTCFullYear() + '-' + pad(month, 2) + '-' + pad(date.getUTCDate(), 2) + ' ' + formatTime(date);
}

function fetchRacingSkillForDrivers(driverIds) {
    return new Promise(resolve => {
        GM_xmlhttpRequest({
            method: 'GET',
            url: `${FB_URL}${driverIds}.json?orderBy="date_utc"&limitToLast=1`,
            headers: {'Content-Type': 'application/json'},
            onload: ({responseText}) => resolve(JSON.parse(responseText))
        });
    });
}

function saveRacingSkill(userId, racingSkillString) {
    const now = new Date();
    const data = { rs: racingSkillString, rs_string: racingSkillString, date_utc: formatDate(now)};
    return new Promise(resolve => {
        GM_xmlhttpRequest({
            method: 'POST',
            url: `${FB_URL}${userId}.json`,
            data: JSON.stringify(data),
            headers: {'Content-Type': 'application/json'},
            onload: (response) => { }
        });
    });
}
//

function showSpeed() {
    if (!SHOW_SPEED || $('#racingdetails').size() < 1 || $('#racingdetails').find('#speed_mph').size() > 0)
        return;

    // save some space
    $('#racingdetails').find('li.pd-name').each(function() {
        if ($(this).text() == 'Name:') $(this).hide();
        if ($(this).text() == 'Position:') $(this).text('Pos:');
        if ($(this).text() == 'Completion:') $(this).text('Compl:');
    });
    $('#racingdetails').append('<li id="speed_mph" class="pd-val"></li>');

    maybeClear();

    x = setInterval(function() {
        if ($('#racingupdatesnew').find('div.track-info').size() < 1) {
            maybeClear();
            return;
        }

        let laps = $('#racingupdatesnew').find('div.title-black').text().split(" - ")[1].split(" ")[0];
        let len = $('#racingupdatesnew').find('div.track-info').attr('data-length').replace('mi', '');
        let compl = $('#racingdetails').find('li.pd-completion').text().replace('%', '');

        if (last_compl >= 0) {
            let speed = (compl - last_compl) / 100 * laps * len * 60 * 60 * 1000 / period;
            $('#speed_mph').text(speed.toFixed(2) + 'mph');
        }
        last_compl = compl;
    }, period);
}

function showPenalty() {
    if ($('#racingAdditionalContainer').find('div.msg.right-round').size() > 0 &&
        $('#racingAdditionalContainer').find('div.msg.right-round').text().trim().startsWith('You have recently left')) {
        const penalty = GM_getValue('leavepenalty') * 1000;
        const now = Date.now();
        if (penalty > now) {
            const date = new Date(penalty);
            $('#racingAdditionalContainer').find('div.msg.right-round').text('You may join an official race at ' + formatTime(date) + '.');
        }
    }
}

function checkPenalty() {
    if (penaltyNotif) clearTimeout(penaltyNotif);
    const leavepenalty = GM_getValue('leavepenalty');
    const penaltyLeft = leavepenalty * 1000 - Date.now();
    if (NOTIFICATIONS && penaltyLeft > 0) {
        penaltyNotif = setTimeout(function() {
            GM_notification("You may join an official race now.", "Torn: Racing enhancements");
        }, penaltyLeft);
    }
}

function updateSkill(level) {
    const skill = Number(level).toFixed(5);
    const prev = GM_getValue('racinglevel');

    if (SHARE_RS && level != prev) {
        saveRacingSkill(userID, skill);
    }

    if (NOTIFICATIONS && prev !== "undefined" && typeof prev !== "undefined" && level > prev) {
        const inc = Number(level - prev).toFixed(5);
        GM_notification("Your racing skill has increased by " + inc + "!", "Torn: Racing enhancements");
        GM_setValue('lastRSincrement', inc);
    }
    GM_setValue('racinglevel', level);

    if ($('#racingMainContainer').find('div.skill').size() > 0) {
        if ($("#sidebarroot").find("a[class^='menu-value']").size() > 0) {
            // move the elements to the left a little bit to fit 5th decimal digit in desktop mode
            $('#racingMainContainer').find('div.skill-desc').css('left', '5px');
            $('#racingMainContainer').find('div.skill').css('left', '5px').text(skill);
        } else {
            $('#racingMainContainer').find('div.skill').text(skill);
        }

        const lastInc = GM_getValue('lastRSincrement');
        if (NOTIFICATIONS && lastInc) {
            $('div.skill').append(`<div style="margin-top: 10px;">Last gain: ${lastInc}</div>`);
        }
    }
}

function parseRacingData(data) {
    // no sidebar in phone mode
    const my_name = $("#sidebarroot").find("a[class^='menu-value']").html() || data.user.playername;

    updateSkill(data['user']['racinglevel']);

    const leavepenalty = data['user']['leavepenalty'];
    GM_setValue('leavepenalty', leavepenalty);
    checkPenalty();

    // display race link
    if ($('#raceLink').size() < 1) {
        RACE_ID = data.raceID;
        const raceLink = `<a id="raceLink" href="https://www.torn.com/loader.php?sid=racing&tab=log&raceID=${RACE_ID}" style="float: right; margin-left: 12px;">Link to the race</a>`;
        $(raceLink).insertAfter('#racingEnhSettings');
    }

    // calc, sort & show race results
    if (data.timeData.status >= 3) {
        const carsData = data.raceData.cars;
        const carInfo = data.raceData.carInfo;
        const trackIntervals = data.raceData.trackData.intervals.length;
        let results = [], crashes = [];

        for (const playername in carsData) {
            const userId = carInfo[playername].userID;
            const intervals = decode64(carsData[playername]).split(',');
            let raceTime = 0;
            let bestLap = 9999999999;

            if (intervals.length / trackIntervals == data.laps) {
                for (let i = 0; i < data.laps; i++) {
                    let lapTime = 0;
                    for (let j = 0; j < trackIntervals; j++) {
                        lapTime += Number(intervals[i * trackIntervals + j]);
                    }
                    bestLap = Math.min(bestLap, lapTime);
                    raceTime += Number(lapTime);
                }
                results.push([playername, userId, raceTime, bestLap]);
            } else {
                crashes.push([playername, userId, 'crashed']);
            }
        }

        // sort by time
        results.sort(compare);
        addExportButton(results, crashes, my_name, data.raceID, data.timeData.timeEnded);

        if (SHOW_RESULTS) {
            showResults(results);
            showResults(crashes, results.length);
        }
    }
}

// compare by time
function compare(a, b) {
    if (a[2] > b[2]) return 1;
    if (b[2] > a[2]) return -1;

    return 0;
}

function showResults(results, start = 0) {
    for (let i = 0; i < results.length; i++) {
        $('#leaderBoard').children('li').each(function() {
            const name = $(this).find('li.name').text().trim();
            if (name == results[i][0]) {
                const p = i + start + 1;
                let place;
                if (p != 11 && (p%10) == 1)
                    place = p + 'st';
                else if (p != 12 && (p%10) == 2)
                    place = p + 'nd';
                else if (p != 13 && (p%10) == 3)
                    place = p + 'rd';
                else
                    place = p + 'th';

                const result = typeof results[i][2] === 'number' ? formatTimeMsec(results[i][2] * 1000) : results[i][2];
                const bestLap = results[i][3] ? formatTimeMsec(results[i][3] * 1000) : null;
                $(this).find('li.name').html($(this).find('li.name').html().replace(name, `${name} ${place} ${result}` + (bestLap ? ` (best: ${bestLap})` : '')));
                return false;
            }
        });
    }
}


function addSettingsDiv() {
    if ($("#racingupdatesnew").size() > 0 && $('#racingEnhSettings').size() < 1) {
        const div = '<div style="font-size: 12px; line-height: 24px; padding-left: 10px; padding-right: 10px; background: repeating-linear-gradient(90deg,#242424,#242424 2px,#2e2e2e 0,#2e2e2e 4px); border-radius: 5px;">' +
              '<a id="racingEnhSettings" style="text-align: right; cursor: pointer;">Settings</a>' +
              '<div id="racingEnhSettingsContainer" style="display: none;"><ul style="color: #ddd;">' +
              '<li><input type="checkbox" style="margin-left: 5px; margin-right: 5px" id="showSpeedChk"><label>Show current speed</label></li>' +
              '<li><input type="checkbox" style="margin-left: 5px; margin-right: 5px" id="showNotifChk"><label>Show notifications</label></li>' +
              '<li><input type="checkbox" style="margin-left: 5px; margin-right: 5px" id="showResultsChk"><label>Show results</label></li>' +
              '<li><input type="checkbox" style="margin-left: 5px; margin-right: 5px" id="showSkinsChk"><label>Show racing skins</label></li>' +
              '<li><input type="checkbox" style="margin-left: 5px; margin-right: 5px" id="shareRacingSkill"><label>Share racing skill with others</label></li></ul></div></div>';
        $('#racingupdatesnew').prepend(div);

        $('#racingEnhSettingsContainer').find('input[type=checkbox]').each(function() {
            if ($(this).attr('id') === 'shareRacingSkill') {
                // sharing is disabled by default
                $(this).prop('checked', GM_getValue($(this).attr('id')) == 1);
            } else {
                $(this).prop('checked', GM_getValue($(this).attr('id')) != 0);
            }
        });

        $('#racingEnhSettings').on('click', function() {
            $('#racingEnhSettingsContainer').toggle();
        });
        $('#racingEnhSettingsContainer').on('click', 'input', function() {
            const id = $(this).attr('id');
            const checked = $(this).prop('checked');
            GM_setValue(id, checked ? 1 : 0);
        });
    }
}

function addExportButton(results, crashes, my_name, race_id, time_ended) {
    if ($("#racingupdatesnew").size() > 0 && $('#downloadAsCsv').size() < 1) {
        let csv = 'position,name,id,time,best_lap,rs\n';
        for (let i = 0; i < results.length; i++) {
            const timeStr = formatTimeMsec(results[i][2] * 1000, true);
            const bestLap = formatTimeMsec(results[i][3] * 1000);
            csv += [i+1, results[i][0], results[i][1], timeStr, bestLap, (results[i][0] === my_name ? GM_getValue('racinglevel') : '')].join(',') + '\n';
        }
        for (let i = 0; i < crashes.length; i++) {
            csv += [results.length + i + 1, crashes[i][0], crashes[i][1], crashes[i][2], '', (results[i][0] === my_name ? GM_getValue('racinglevel') : '')].join(',') + '\n';
        }

        const timeE = new Date();
        timeE.setTime(time_ended * 1000);
        const fileName = `${timeE.getUTCFullYear()}${pad(timeE.getUTCMonth() + 1, 2)}${pad(timeE.getUTCDate(), 2)}-race_${race_id}.csv`;

        const myblob = new Blob([csv], {type: 'application/octet-stream'});
        const myurl = window.URL.createObjectURL(myblob);
        const exportBtn = `<a id="downloadAsCsv" href="${myurl}" style="float: right; margin-left: 12px;" download="${fileName}">Download results as CSV</a>`;
        $(exportBtn).insertAfter('#racingEnhSettings');
    }
}

function addPlaybackButton() {
    if ($("#racingupdatesnew").size() > 0 && $('div.race-player-container').size() < 1) {
        $('div.drivers-list > div.cont-black').prepend(`<div class="race-player-container"><button id="play-pause-btn" class="play"></button>
<div id="speed-slider"><span id="prev-speed" class="disabled"></span><span id="speed-value">x1</span><span id="next-speed" class="enabled"></span></div>
<div id="replay-bar-container"><span id="progress-active"></span><span id="progress-inactive"></span></div>
<div id="race-timer-container"><span id="race-timer">00:00:00</span></div></div>`);
    }
}

'use strict';

// Your code here...
ajax((page, xhr) => {
    if (page != "loader") return;
    $("#racingupdatesnew").ready(addSettingsDiv);
    $("#racingupdatesnew").ready(showSpeed);
    $('#racingAdditionalContainer').ready(showPenalty);
    if ($(location).attr('href').includes('sid=racing&tab=log&raceID=')) {
        $('#racingupdatesnew').ready(addPlaybackButton);
    }
    try {
        parseRacingData(JSON.parse(xhr.responseText));
    } catch (e) {}
});

$("#racingupdatesnew").ready(addSettingsDiv);
$("#racingupdatesnew").ready(showSpeed);
$('#racingAdditionalContainer').ready(showPenalty);

if ($(location).attr('href').includes('sid=racing&tab=log&raceID=')) {
    $('#racingupdatesnew').ready(addPlaybackButton);
}

// hide playback button when not showing a race log
$('#racingupdatesnew').ready(function() {
    $('div.racing-main-wrap').find('ul.categories > li > a').on('click', function() {
        $('#racingupdatesnew').find('div.race-player-container').hide();
    });
});

checkPenalty();

if ((SHARE_RS || SHOW_SKINS) && $(location).attr('href').includes('sid=racing')) {
    $("#racingupdatesnew").ready(function() {
        updateDriversList();
        // On change race tab, (re-)insert the racing skills if applicable:
        new MutationObserver(updateDriversList).observe(document.getElementById('racingAdditionalContainer'), {childList: true});
    });
}
