// ==UserScript==
// @name         Torn: Racing enhancements
// @namespace    lugburz.racing_enhancements
// @version      0.2.3
// @description  Show car's current speed, precise skill, official race penalty.
// @author       Lugburz
// @match        https://www.torn.com/*
// @require      https://github.com/f2404/torn-userscripts/raw/30647929a55ccec24756d3b8a2598713db619f64/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/racing_show_speed.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @run-at       document-body
// ==/UserScript==

// Whether to show notifications.
const NOTIFICATIONS = true;

// Whether to show race result as soon as a race starts.
const SHOW_RESULTS = true;

// Whether to show current speed.
const SHOW_SPEED = true;

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
    const skill = Number(level).toFixed(4);
    const prev = GM_getValue('racinglevel');

    if (NOTIFICATIONS && prev !== "undefined" && typeof prev !== "undefined" && level > prev) {
        GM_notification("Your racing skill has increased by " + Number(level - prev).toFixed(4) + "!", "Torn: Racing enhancements");
    }
    GM_setValue('racinglevel', level);

    if ($('#racingMainContainer').find('div.skill').size() > 0) {
        $('#racingMainContainer').find('div.skill').text(skill);
    }
}

function parseRacingData(data) {
    updateSkill(data['user']['racinglevel']);

    const leavepenalty = data['user']['leavepenalty'];
    GM_setValue('leavepenalty', leavepenalty);
    checkPenalty();

    // calc, sort & show race results
    if (data.timeData.status >= 3) {
        const carsData = data.raceData.cars;
        const trackIntervals = data.raceData.trackData.intervals.length;
        let results = [], crashes = [];

        for (const playername in carsData) {
            const intervals = decode64(carsData[playername]).split(',');
            let raceTime = 0;
            for (let i in intervals) {
                raceTime += 1 * intervals[i];
            }

            if (intervals.length / trackIntervals == data.laps) {
                results.push([playername, raceTime]);
            } else {
                crashes.push([playername, raceTime]);
            }
        }

        // sort by time
        results.sort(compare);
        addExportButton(results, crashes);

        if (SHOW_RESULTS) {
            showResults(results);
            showResults(crashes, results.length);
        }
    }
}

// compare by time
function compare(a, b) {
    if (a[1] > b[1]) return 1;
    if (b[1] > a[1]) return -1;

    return 0;
}

function showResults(results, start = 0) {
    for (let i = 0; i < results.length; i++) {
        $('#leaderBoard').children('li').each(function() {
            const name = $(this).find('li.name').text().trim();
            if (name == results[i][0]) {
                const p = i + start + 1;
                const place = p == 1 ? '1st' : (p == 2 ? '2nd' : (p == 3 ? '3rd' : p + 'th'));
                $(this).find('li.name').html($(this).find('li.name').html().replace(name, name + ' ' + place + ' ' + formatTimeMsec(results[i][1] * 1000)));
                return false;
            }
        });
    }
}

function addExportButton(results, crashes) {
    if ($("#racingupdatesnew").size() > 0 && $('#downloadAsCsv').size() < 1) {
        let csv = '';
        for (let i = 0; i < results.length; i++) {
            const timeStr = formatTimeMsec(results[i][1] * 1000);
            csv += [i+1, results[i][0], timeStr].join(',') + '\n';
        }
        for (let i = 0; i < crashes.length; i++) {
            const timeStr = formatTimeMsec(crashes[i][1] * 1000);
            csv += [results.length + i + 1, crashes[i][0], timeStr].join(',') + '\n';
        }

        const myblob = new Blob([csv], {type: 'application/octet-stream'});
        const myurl = window.URL.createObjectURL(myblob);
        const div = '<div style="font-size: 12px; line-height: 24px; padding-left: 10px; background: repeating-linear-gradient(90deg,#242424,#242424 2px,#2e2e2e 0,#2e2e2e 4px);border-radius: 5px;">' +
              `<a id="downloadAsCsv" href="${myurl}" download="results.csv">Download results as CSV</a></div>`;
        $('#racingupdatesnew').prepend(div);
    }
}

'use strict';

// Your code here...
ajax((page, xhr) => {
    if (page != "loader") return;
    $("#racingupdatesnew").ready(showSpeed);
    $('#racingAdditionalContainer').ready(showPenalty);
    try {
        parseRacingData(JSON.parse(xhr.responseText));
    } catch (e) {}
});

$("#racingupdatesnew").ready(showSpeed);
$('#racingAdditionalContainer').ready(showPenalty);

checkPenalty();
