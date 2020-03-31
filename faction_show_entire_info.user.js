// ==UserScript==
// @name         Faction: Show entire faction info
// @namespace    lugburz.faction.show_entire_info
// @version      0.1
// @description  Show the entire faction info and remove the scrollbar.
// @author       Lugburz
// @match        https://www.torn.com/factions.php*
// @require      https://github.com/f2404/torn-userscripts/raw/master/lib/lugburz_lib.js
// @grant        none
// ==/UserScript==

function removeScrollbar() {
    $('#factions').find('div.faction-description').removeClass('faction-description');
}

(function() {
    'use strict';

    // Your code here...
    ajax((page) => {
        if (page != "factions") return;
        $("factions").ready(removeScrollbar);
    });

    $('#factions').ready(removeScrollbar);
})();
