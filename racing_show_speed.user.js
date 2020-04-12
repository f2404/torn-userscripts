// ==UserScript==
// @name         Torn: Racing: Show speed
// @namespace    lugburz.racing.show_speed
// @version      0.1.1
// @description  Show car's current speed.
// @author       Lugburz
// @match        https://www.torn.com/loader.php?sid=racing*
// @require      https://github.com/f2404/torn-userscripts/raw/master/lib/lugburz_lib.js
// @grant        none
// ==/UserScript==

var period = 1000;
var last_compl = -1.0;

function showSpeed() {
    if ($('#racingdetails').find('#speed_mph').size() > 0)
        return;

    // save some space
    $('#racingdetails').find('li.pd-name').each(function() {
        if ($(this).text() == 'Position:') $(this).text('Pos.:');
        if ($(this).text() == 'Completion:') $(this).text('Compl.:');
    });
    $('#racingdetails').append('<li id="speed_mph" class="pd-val"></li>');

    let x = setInterval(function() {
        if ($('#racingupdatesnew').find('div.track-info').size() < 1)
            return;

        let len = $('#racingupdatesnew').find('div.track-info').attr('data-length').replace('mi', '');
        let compl = $('#racingdetails').find('li.pd-completion').text().replace('%', '');

        if (last_compl >= 0) {
            let speed = (compl - last_compl) / 100 * len * 60 * 60 * 1000 / period;
            $('#speed_mph').text(speed.toFixed(2) + 'mph');
        }
        last_compl = compl;
    }, period);
}

(function() {
    'use strict';

    // Your code here...
    ajax((page) => {
        if (page != "loader") return;
        $("#racingupdatesnew").ready(showSpeed);
    });

    $("#racingupdatesnew").ready(showSpeed);
})();

