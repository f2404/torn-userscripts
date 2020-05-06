// ==UserScript==
// @name         Torn: Racing: Log scraper
// @namespace    lugburz.racing_log_scraper
// @version      0.1.3
// @description  Collect anonymous racing stats data.
// @author       Lugburz
// @match        https://www.torn.com/loader.php?sid=racing*
// @require      https://github.com/f2404/torn-userscripts/raw/8bbe1e8c2120fe3bfa01b374c5646c8e770c2b27/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/racing_log_scraper.user.js
// @connect      script.google.com
// @connect      script.googleusercontent.com
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @run-at       document-body
// ==/UserScript==

// Convert to 32bit integer
function stringToHash(string) {
    var hash = 0;
    if (string.length == 0) return hash;
    for (let i = 0; i < string.length; i++) {
        const char = string.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

function anonymizeCarsData(data) {
    const my_name = $("#sidebarroot").find("a[class^='menu-value']").html();

    let i = 1;
    for (let playername in data) {
        if (playername == my_name) {
            data['racer0'] = data[playername]; // always racer0
        } else {
            data['racer'+i] = data[playername];
            i++;
        }
        delete data[playername];
    }

    return data;
}

function parseLog(json) {
    if ($('#racingupdatesnew').find('div.title-black').first().text().trim() != 'Race info' || json.timeData.status != 3) {
        return;
    }

    const URL = "https://script.google.com/macros/s/AKfycby2LzfNCfcjFQkDQ2tVE4Kjk_OXLiPlv3wVwhih-pWP9qnc1OE/exec";

    const properties = $('#racingupdatesnew').find('ul.properties-wrap').children();
    const id = $(properties[0]).find('div.title').text().trim().replace('ID: ', '');
    const type = $(properties[2]).find('div.title').text().trim().replace('Type: ', '');
    const track = $(properties[6]).find('div.title').text().trim().replace('Track: ', '');
    const laps = $(properties[7]).find('div.title').text().trim().replace('Laps: ', '');
    const participants = $(properties[8]).find('div.title').text().trim().replace('Participants: ', '');

    const length = $('#racingupdatesnew').find('div.track-info').attr('data-length').trim().replace('mi', '');
    const wait_time = json.logData.waitTime;
    const user_id = json.user.userID;

    const intervals_length = json.raceData.trackData.intervals.length;
    const carsdata = JSON.stringify(anonymizeCarsData(json.raceData.cars));

    let time, car, place;
    const my_name = $("#sidebarroot").find("a[class^='menu-value']").html();
    $('#leaderBoard').find('ul.driver-item').each(function() {
        if ($(this).find('li.name').text().split(' ')[0].trim() == my_name) {
            time = $(this).find('li.time').text().trim();
            car = $(this).find('li.car').find('img').attr('title');
            place = Number($(this).parent().attr('lorder')) + 1;
            return false;
        }
    });

    if (!time || !car || !place) {
        console.log("Log " + id + ": couldn't find some info, is this someone else's log?");
        return;
    }

    const skill_before = GM_getValue('rs_cur_level');
    const skill_after = Number(json.user.racinglevel).toFixed(4);
    GM_setValue('rs_prev_level', skill_before);
    GM_setValue('rs_cur_level', skill_after);

    console.log('Uploading log ' + id + '...');
    const data = $.param({id: stringToHash(id+user_id), track: track, length: length, laps: laps, type: type, wait_time: wait_time, car: car, time: time, place: place,
                          participants: participants, skill_before: skill_before, skill_after: skill_after, intervals_length: intervals_length, carsdata: carsdata});
    GM_xmlhttpRequest({
        method: "POST",
        url: URL,
        data: data,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        onload: function(response) {
            console.log(response.responseText);
            if (response.responseText == "Success") {
                GM_notification("Race log has been uploaded.", "Torn: Racing: Log scraper");
            } else {
                GM_notification(response.responseText, "Torn: Racing: Log scraper");
            }
        }
    });
}

// Your code here...
ajax((page, xhr) => {
    if (page != "loader") return;
    let json = '';
    try {
        json = JSON.parse(xhr.responseText);
    } catch (e) {}
    if (json) {
        $("#racingupdatesnew").ready(parseLog(json));
    }
});
