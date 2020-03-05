// ==UserScript==
// @name         Torn: Faction: Show OC due date
// @namespace    lugburz.faction.show_oc_due_date
// @version      0.2
// @description  Show when OC's are due, in addition to time left that Torn shows.
// @author       Lugburz
// @match        https://www.torn.com/factions.php?step=your*
// @require      https://greasyfork.org/scripts/390917-dkk-torn-utilities/code/DKK%20Torn%20Utilities.js?version=744690
// @grant        none
// ==/UserScript==

// Whether to use Torn time (TCT) or local time
var USE_TCT = false

// Whether to replace the text in the "Status" column or append to it
var REPLACE = false



function pad(num, size) {
    return ('000000000' + num).substr(-size);
}

function format_date(d) {
    if (USE_TCT) {
        let m = d.getUTCMonth() + 1;
        return pad(d.getUTCHours(), 2) + ":" + pad(d.getUTCMinutes(), 2) + " " + pad(d.getUTCDate(), 2) + "/" + pad(m, 2) + " TCT";
    }

    let options = {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'};
    return d.toLocaleDateString(undefined, options);
}

function update() {
    $(".crimes-list > li").each(function(index) {
        let status = $(this).find(".status");
        if (typeof status !== 'undefined') {
            let found = $(status).text().match(/((\d+)h )?(\d+)min left/);
            if (found !== undefined && found !== null) {
                let hours = found[2] || 0;
                let mins = found[3] || 0;

                let d = new Date(Date.now());
                d.setTime(d.getTime() + hours*60*60*1000 + mins*60*1000);

                if (REPLACE) {
                    $(status).html("due at " + format_date(d));
                } else {
                    let html = $(status).html();
                    $(status).html(format_date(d) + "<br>" + html);
                }
            }
        }
    });
}

(function() {
    'use strict';

    ajax((page, json, uri) => {
        if (page != "factions") return;
        $("ul.crimes-list").ready(update);
    });

    $("ul.crimes-list").ready(update);
})();
