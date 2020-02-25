// ==UserScript==
// @name         Torn: Racing: Links to profiles
// @namespace    lugburz.racing.profiles
// @version      0.1
// @description  Adds links to player profiles to their names in the racing list.
// @author       Lugburz
// @match        https://www.torn.com/loader.php?sid=racing*
// @require      https://greasyfork.org/scripts/390917-dkk-torn-utilities/code/DKK%20Torn%20Utilities.js?version=744690
// ==/UserScript==

function addLinks() {
    var names = $("ul.overview").find("li.name");
    names.each(function() {
        var parent = $(this).parent().parent()
        if (parent.attr("id").startsWith("lbr-")) {
            var username = $(this).text();
            var user_id = parent.attr("id").replace("lbr-", "");
            $(this).html("<a href=/profiles.php?XID="+user_id+">"+username+"</a>");
        }
    });
}

(function() {
    'use strict';

    // Your code here...
    ajax((page, json, uri) => {
        if (page != "loader" || !json) return;
        $("ul.overview").ready(addLinks);
    });

    $("ul.overview").ready(addLinks);
})();
