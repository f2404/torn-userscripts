// ==UserScript==
// @name         Hide Sidebar Areas
// @namespace    lugburz.hide_sidebar_areas
// @version      0.1
// @description  Hide unwanted areas in the sidebar.
// @author       Lugburz
// @match        https://www.torn.com/*
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/hide_sidebar_areas.user.js
// @grant        none
// ==/UserScript==

// Add areas that you want to be hidden here. Both area names (such as "Items") and links (e.g., "competition.php") are supported.
// Example:
//   const HIDE = ['Items', 'competitions.php'];
const HIDE = [];

(function() {
    'use strict';

    // Your code here...
    const areas = $('#sidebar').find('div[class^=area-desktop___]');
    areas.each(function() {
        const name = $(this).find('span[class^=linkName___]').text().trim();
        const href = $(this).find('a[class^=desktopLink___]').attr('href').replace('/', '');
        if (HIDE.includes(name) || HIDE.includes(name.toLowerCase()) || HIDE.includes(href) || HIDE.includes(href.toLowerCase())) {
            $(this).hide();
        }
    });
})();