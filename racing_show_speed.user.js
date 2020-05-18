// ==UserScript==
// @name         Torn: Racing enhancements
// @namespace    lugburz.racing_enhancements
// @version      0.2.1
// @description  Show car's current speed, precise skill, official race penalty.
// @author       Lugburz
// @match        https://www.torn.com/loader.php?sid=racing*
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

    if (penaltyNotif) clearTimeout(penaltyNotif);
    const penaltyLeft = leavepenalty * 1000 - Date.now();
    if (NOTIFICATIONS && penaltyLeft > 0) {
        penaltyNotif = setTimeout(function() {
            GM_notification("You may join an official race now.", "Torn: Racing enhancements");
        }, penaltyLeft);
    }

    if (!SHOW_RESULTS)
        return;

    // show race results
    if (data.timeData.status >= 3) {
        const carsData = data.raceData.cars;
        for (let playername in carsData) {
            const intervals = decode64(carsData[playername]).split(',');
            let raceTime = 0;
            for (let i in intervals) {
                raceTime += 1 * intervals[i];
            }

            $('#leaderBoard').children('li').each(function() {
                const name = $(this).find('li.name').text().trim();
                if (name == playername) {
                    $(this).find('li.name').html($(this).find('li.name').html().replace(name, name + ' ' + formatTimeMsec(raceTime * 1000)));
                    return false;
                }
            });
        }
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
