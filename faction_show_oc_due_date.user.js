// ==UserScript==
// @name         Torn: Faction: Show OC due date
// @namespace    lugburz.faction.show_oc_due_date
// @version      0.3.8
// @description  Show when OC's are due, in addition to time left that Torn shows.
// @author       Lugburz
// @match        https://www.torn.com/factions.php?step=your*
// @require      https://github.com/f2404/torn-userscripts/raw/master/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/faction_show_oc_due_date.user.js
// @grant        none
// ==/UserScript==

// Whether to use Torn time (TCT) or local time
const USE_TCT = false;

// Whether to replace the text in the "Status" column or append to it
const REPLACE = false;

// Whether to highlight your team in the OC list
const HIGHLIGHT = true;



function format_date(d) {
    if (USE_TCT) {
        const m = d.getUTCMonth() + 1;
        return pad(d.getUTCHours(), 2) + ":" + pad(d.getUTCMinutes(), 2) + " " + pad(d.getUTCDate(), 2) + "/" + pad(m, 2) + " TCT";
    }

    const options = {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'};
    return d.toLocaleDateString(undefined, options);
}

function format_time(hours, mins) {
    const d = Math.trunc(hours / 24);
    const h = hours % 24;

    return (d > 0 ? d + 'd ' : '') + (d > 0 || h > 0 ? h + 'h ' : '') + mins + 'min';
}

function update() {
    const avail = $("div.begin-wrap").find("ul.crimes-list").find("li.item-wrap").first().find("ul.plans-list").children("li").size();
    if (avail > 0 && $("#membersAvail").size() < 1) {
        const msg = avail == 1 ? '1 member is' : `${avail} members are`;
        const div = `<div id="membersAvail" class="cont-gray10 cont-toggle" style="border-radius: 5px;">${msg} available.</div>`;
        $(div).insertBefore($("div.faction-crimes-wrap").first());
    }

    let my_name = "";
    if (HIGHLIGHT) {
        my_name = $("#sidebarroot").find("a[class^='menu-value']").html();
    }

    $("ul.crimes-list > li").each(function() {
        const status = $(this).find(".status");
        if (typeof status !== 'undefined' && status !== null && $(status).text()) {
            const found = $(status).text().match(/^\n(\s+)?((\d+)h )?(\d+)min left\s+$/);

            if (found !== undefined && found !== null) {
                const hours = found[3] || 0;
                const mins = found[4] || 0;

                let d = new Date(Date.now());
                d.setTime(d.getTime() + hours*60*60*1000 + mins*60*1000);

                if (REPLACE) {
                    $(status).html("due at " + format_date(d));
                } else {
                    $(status).html(format_date(d) + "<br>" + format_time(hours, mins) + ' left');
                }
            }
        }

        if (HIGHLIGHT && my_name) {
            const team = $(this).find(".team");
            if (typeof team !== 'undefined' && typeof team.html() !== 'undefined' && team.html().includes(my_name)) {
                $(this).addClass("bg-green");
            }
        }
    });
}

(function() {
    'use strict';

    ajax((page) => {
        if (page != "factions") return;
        $("ul.crimes-list").ready(update);
    });

    $("ul.crimes-list").ready(update);
})();
