// ==UserScript==
// @name         Torn: Faction: Simplified log view
// @namespace    lugburz.faction.simplified_log_view
// @version      0.2.1
// @description  Group similar messages in the faction armory log and provide a summary ("used x items").
// @author       Lugburz
// @match        https://www.torn.com/factions.php?step=your*
// @require      https://github.com/f2404/torn-userscripts/raw/master/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/faction_simplified_log_view.user.js
// @grant        none
// ==/UserScript==

const armory_used_text = "one of the faction's";
const armory_deposited_text = "deposited 1 x";

function maybe_update_row(row, n, from_time, to_time, to_date, msg_html) {
    if (msg_html.includes(armory_used_text)) {
        // used
        if (n == 1) {
            row.find("span.info").html(msg_html.replace(armory_used_text, "<b>" + n + "x</b>").replace("items.", "item."));
        } else if (n > 1) {
            row.find("span.date").text(from_time + " - " + to_time + " " + to_date);
            row.find("span.info").html(msg_html.replace(armory_used_text, "<b>" + n + "x</b>"));
        }
    } else {
        // deposited
        if (n > 1) {
            row.find("span.date").text(from_time + " - " + to_time + " " + to_date);
            row.find("span.info").html(msg_html.replace(armory_deposited_text, "deposited <b>" + n + "x</b>"));
        }
    }
}

function simplify() {
    let n = 0;
    let msg_html = "";
    let from_date = "";
    let to_date = "";
    let from_time = "";
    let to_time = "";
    let row = "";

    const entries = $("#tab4-4").find("li");
    if (entries.length < 2) {
        return;
    }

    entries.each(function() {
        const time = $(this).find("span")[1];
        const date = $(this).find("span")[2];
        const info = $(this).find("span.info");

        if ($(this).find(info).html().localeCompare(msg_html) == 0) {
            from_time = $(this).find("span").find(time).text();
            from_date = $(this).find("span").find(date).text();
            n++;
            $(this).remove();
        } else if ($(this).find(info).text().includes(armory_used_text) || $(this).find(info).text().includes(armory_deposited_text)) {
            maybe_update_row(row, n, from_time, to_time, to_date, msg_html);

            msg_html = $(this).find(info).html();
            to_time = $(this).find("span").find(time).text();
            to_date = $(this).find("span").find(date).text();
            row = $(this);
            n = 1;
        } else {
            maybe_update_row(row, n, from_time, to_time, to_date, msg_html);

            n = 0;
        }
    });

    maybe_update_row(row, n, from_time, to_time, to_date, msg_html);
}

(function() {
    'use strict';

    // Your code here...
    ajax((page) => {
        if (page != "factions") return;
        $("#tab4-4").ready(simplify);
    });

    $("#tab4-4").ready(simplify);
})();
