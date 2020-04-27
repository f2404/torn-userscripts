// ==UserScript==
// @name         Torn: Scripts library
// @namespace    lugburz.lib
// @version      0.1
// @description  Library of functions used in my Torn scripts.
// @author       Lugburz
// @exclude      *
// @grant        none
// ==/UserScript==

function ajax(callback) {
    $(document).ajaxComplete((event, xhr, settings) => {
        if (xhr.readyState > 3 && xhr.status == 200) {
            if (settings.url.indexOf("torn.com/") < 0) settings.url = "torn.com" + (settings.url.startsWith("/") ? "" : "/") + settings.url;
            var page = settings.url.substring(settings.url.indexOf("torn.com/") + "torn.com/".length, settings.url.indexOf(".php"));

            callback(page, xhr, settings);
        }
    });
}

function pad(num, size) {
    return ('000000000' + num).substr(-size);
}
