// ==UserScript==
// @name         Torn: Racing: Links to profiles
// @namespace    lugburz.racing.profiles
// @version      0.1.1
// @description  Adds links to player profiles to their names in the racing list.
// @author       Lugburz
// @match        https://www.torn.com/loader.php?sid=racing*
// @require      https://github.com/f2404/torn-userscripts/raw/master/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/racing_profiles.user.js
// @grant        none
// ==/UserScript==

function addLinks() {
    const names = $("ul.overview").find("li.name");
    names.each(function() {
        const parent = $(this).parent().parent()
        if (parent.attr("id").startsWith("lbr-")) {
            const username = $(this).text();
            const user_id = parent.attr("id").replace("lbr-", "");
            $(this).html("<a href=/profiles.php?XID=" + user_id + ">" + username + "</a>");
        }
    });
}

(function() {
    'use strict';

    // Your code here...
    ajax((page) => {
        if (page != "loader") return;
        $("ul.overview").ready(addLinks);
    });

    $("ul.overview").ready(addLinks);
})();
