// ==UserScript==
// @name         Torn: Racing enhancements
// @namespace    lugburz.racing_enhancements
// @version      0.1.6
// @description  Show car's current speed, precise skill, official race penalty.
// @author       Lugburz
// @match        https://www.torn.com/loader.php?sid=racing*
// @require      https://github.com/f2404/torn-userscripts/raw/8bbe1e8c2120fe3bfa01b374c5646c8e770c2b27/lib/lugburz_lib.js
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

var period = 1000;
var last_compl = -1.0;
var x = 0;

function maybeClear() {
    if (x != 0 ) {
        clearInterval(x);
        last_compl = -1.0;
        x = 0;
    }
}

function showSpeed() {
    if ($('#racingdetails').size() < 1 || $('#racingdetails').find('#speed_mph').size() > 0)
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

function formatDate(date) {
    return pad(date.getUTCHours(), 2) + ':' + pad(date.getUTCMinutes(), 2) + ':' + pad(date.getUTCSeconds(), 2);
}

function showPenalty() {
    if ($('#racingAdditionalContainer').find('div.msg.right-round').size() > 0 &&
        $('#racingAdditionalContainer').find('div.msg.right-round').text().trim().startsWith('You have recently left')) {
        const penalty = GM_getValue('leavepenalty') * 1000;
        const now = Date.now();
        if (penalty > now) {
            const date = new Date(penalty);
            $('#racingAdditionalContainer').find('div.msg.right-round').text('You may join an official race at ' + formatDate(date) + '.');
        }
    }
}

function parseRacingData(data) {
    const skill = data['user']['racinglevel'];
    if ($('#racingMainContainer').find('div.skill').size() > 0)
        $('#racingMainContainer').find('div.skill').text(Number(skill).toFixed(4));

    const leavepenalty = data['user']['leavepenalty'];
    GM_setValue('leavepenalty', leavepenalty);
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
