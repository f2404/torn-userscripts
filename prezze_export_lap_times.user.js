// ==UserScript==
// @name         Torn: Export lap times
// @namespace    lugburz.prezze_export_lap_times
// @version      0.1.1
// @description  Prezze is 40!
// @author       Lugburz
// @match        https://www.torn.com/loader.php?sid=racing*
// @require      https://github.com/f2404/torn-userscripts/raw/e3bb87d75b44579cdb6f756435696960e009dc84/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/prezze_export_lap_times.user.js
// @downloadURL  https://github.com/f2404/torn-userscripts/raw/master/prezze_export_lap_times.user.js
// @grant        none
// @run-at       document-body
// ==/UserScript==

// Laps to export, must be sorted (default: [1, 51])
const LAPS = [1, 51];


'use strict';

function addExportButton(results, crashes, race_id, time_ended) {
    if ($("#infoSpot").size() > 0 && $('#exportLaps').size() < 1) {
        let csv = `position,name,id,time,best_lap,${LAPS.map(lap => 'lap_'+lap)}\n`;
        results.forEach((result, i) => {
            const timeStr = strictFormat(formatTimeMsec(result[2] * 1000, true));
            const bestLap = strictFormat(formatTimeMsec(result[3] * 1000));
            const indLaps = result.slice(4).map(t => strictFormat(formatTimeMsec(t * 1000)));
            csv += [i+1, result[0], result[1], timeStr, bestLap].concat(indLaps).join(',') + '\n';
        });
        crashes.forEach((crash, i) => {
            const indLaps = crash.slice(4).map(t => formatTimeMsec(t) * 1000);
            csv += [results.length + i + 1, crash[0], crash[1], crash[2], ''].concat(indLaps).join(',') + '\n';
        });

        const timeE = new Date();
        timeE.setTime(time_ended * 1000);
        const fileName = `${timeE.getUTCFullYear()}${pad(timeE.getUTCMonth() + 1, 2)}${pad(timeE.getUTCDate(), 2)}-race_${race_id}.csv`;

        const myblob = new Blob([csv], {type: 'application/octet-stream'});
        const myurl = window.URL.createObjectURL(myblob);
        const exportBtn = `<a id="exportLaps" href="${myurl}" style="float: right; margin-left: 12px;" download="${fileName}">Export lap times</a>`;
        $('#infoSpot').parent().append(exportBtn);
    }
}

function parseRacingData(data) {
    // calc
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
            const indLaps = [];

            for (let i = 0; i < data.laps; i++) {
                let lapTime = 0;
                for (let j = 0; j < trackIntervals; j++) {
                    lapTime += Number(intervals[i * trackIntervals + j]);
                }
                bestLap = Math.min(bestLap, lapTime);
                raceTime += Number(lapTime);

                if (LAPS.includes(i + 1)) {
                    indLaps.push(+lapTime);
                }
            }

            if (intervals.length / trackIntervals == data.laps) {
                results.push([playername, userId, raceTime, bestLap].concat(indLaps));
            } else {
                crashes.push([playername, userId, 'crashed', ''].concat(indLaps));
            }
        }

        // sort by time
        results.sort(compare);
        setTimeout(addExportButton(results, crashes, data.raceID, data.timeData.timeEnded), 100);
    }
}

// compare by time
function compare(a, b) {
    if (a[2] > b[2]) return 1;
    if (b[2] > a[2]) return -1;

    return 0;
}

// prevents sheets from auto formatting data
// https://stackoverflow.com/questions/165042/stop-excel-from-automatically-converting-certain-text-values-to-dates
function strictFormat(str) {
    return `="${str}"`;
}

// Your code here...
ajax((page, xhr) => {
    if (page !== 'loader') return;
    try {
        const json = JSON.parse(xhr.responseText);
        parseRacingData(json);
    } catch (e) {}
});
