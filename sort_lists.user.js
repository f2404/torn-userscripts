// ==UserScript==
// @name         Torn: Sort lists
// @namespace    lugburz.sort_lists
// @version      0.3
// @description  Sort lists (such as blacklist, friendlist, faction members list) by various columns.
// @author       Lugburz
// @match        https://www.torn.com/blacklist.php*
// @match        https://www.torn.com/friendlist.php*
// @match        https://www.torn.com/factions.php*
// @match        https://www.torn.com/stockexchange.php*
// @require      https://greasyfork.org/scripts/390917-dkk-torn-utilities/code/DKK%20Torn%20Utilities.js?version=744690
// @grant        GM_addStyle
// ==/UserScript==

GM_addStyle(`
.headerSortable {
  cursor: pointer;
}

.headerSortDown:after {
  content: " ▾";
  font: inherit;
}

.headerSortUp:after {
  content: " ▴";
  font: inherit;
}`);

function compare (aText, bText, asc) {
    // Returning -1 will place element `a` before element `b`
    if (aText < bText) {
        if (asc) return -1;
        else return 1;
    }

    // Returning 1 will do the opposite
    if (aText > bText) {
        if (asc) return 1;
        else return -1;
    }

    // Returning 0 leaves them as-is
    return 0;
}

function doSort(items, column, ascending, divPrefix = '.title-black > .') {
    if ('level'.localeCompare(column) == 0 || 'lvl'.localeCompare(column) == 0 || 'days'.localeCompare(column) == 0) {
        let sortedByLevel = Array.prototype.sort.bind(items);
        sortedByLevel(function (a, b) {
            let aText = $(a).find('.'+column).text().match(/(\d+)/)[0];
            let bText = $(b).find('.'+column).text().match(/(\d+)/)[0];

            return compare(Number(aText), Number(bText), ascending);
        });
    } else if ('title'.localeCompare(column) == 0 || 'desk'.localeCompare(column) == 0 || 'name'.localeCompare(column) == 0) {
        let sortedByName = Array.prototype.sort.bind(items);
        sortedByName(function (a, b) {
            // works with honors enabled or disabled
            let aText = $(a).find('.name').attr('data-placeholder') || $(a).find('.name').text();
            let bText = $(b).find('.name').attr('data-placeholder') || $(b).find('.name').text();
            if (typeof aText !== 'undefined') aText = aText.toLowerCase();
            if (typeof bText !== 'undefined') bText = bText.toLowerCase();

            return compare(aText, bText, ascending);
        });
    } else if ('status'.localeCompare(column) == 0) {
        let sortedByStatus = Array.prototype.sort.bind(items);
        sortedByStatus(function (a, b) {
            let aText = $(a).find('.'+column).text().replace('Status:', '').trim();
            let bText = $(b).find('.'+column).text().replace('Status:', '').trim();

            return compare (aText, bText, ascending);
        });
    // 'Last Action' script support
    } else if ('member-icons'.localeCompare(column) == 0) {
        // Do not show arrows if no 'Last Action'
        if ($('.title-black > .'+column).text() === 'undefined' || !$('.title-black > .'+column).text().includes('Last Action'))
            return items;

        let sortedByLastAction = Array.prototype.sort.bind(items);
        sortedByLastAction(function (a, b) {
            let aText = $(a).find('.last-action').text().trim();
            let bText = $(b).find('.last-action').text().trim();

            let days = aText.match(/((\d+) day)?/)[2] || 0
            let hours = aText.match(/((\d+) hour)?/)[2] || 0
            let mins = aText.match(/((\d+) minute)?/)[2] || 0
            let aMins = Number(days)*24*60 + Number(hours)*60 + Number(mins)

            days = bText.match(/((\d+) day)?/)[2] || 0
            hours = bText.match(/((\d+) hour)?/)[2] || 0
            mins = bText.match(/((\d+) minute)?/)[2] || 0
            let bMins = Number(days)*24*60 + Number(hours)*60 + Number(mins)

            return compare (Number(aMins), Number(bMins), ascending);
        });
    } else if ('price'.localeCompare(column) == 0 || 'owned'.localeCompare(column) == 0 || 'change'.localeCompare(column) == 0) {
        let sortedByPrice = Array.prototype.sort.bind(items);
        sortedByPrice(function (a, b) {
            let aText = $(a).find('.'+column).text().match(/((\d+\,)?\d+(\.\d+)?)/)[0].replace(',', '');
            let bText = $(b).find('.'+column).text().match(/((\d+\,)?\d+(\.\d+)?)/)[0].replace(',', '');

            // 'down' means the number is negative
            if ('change'.localeCompare(column) == 0) {
                if ($(a).find('.'+column).hasClass('down')) aText = -1 * Number(aText);
                if ($(b).find('.'+column).hasClass('down')) bText = -1 * Number(bText);
            }

            return compare(Number(aText), Number(bText), ascending);
        });
    } else {
        // shouldn't happen
        return items;
    }

    let columns = [ 'level', 'lvl', 'title', 'desk', 'name', 'days', 'status', 'member-icons', 'price', 'owned', 'change'].forEach((elem) => {
        $(divPrefix+elem).removeClass('headerSortUp');
        $(divPrefix+elem).removeClass('headerSortDown');
    });

    if (ascending) {
        $(divPrefix+column).addClass('headerSortDown');
    } else {
        $(divPrefix+column).addClass('headerSortUp');
    }

    return items;
}

// Blacklist, friendlist
function addUserlistSort() {
    let user_list = $('ul.user-info-blacklist-wrap');
    let users = $(user_list).children('li');
    let ascending = true;
    let last_sort = '';

    let columns = ['title', 'level', 'status'].forEach((column) => {
        $('div.title-black > div.'+column).addClass('headerSortable');
        $('div.'+column).on('click', function() {
            if (column != last_sort) ascending = true;
            last_sort = column;
            users = doSort(users, column, ascending);
            ascending = !ascending;
            $(user_list).append(users);
        });
    });
}

// Faction members
function addMemberlistSort() {
    let user_list = $('ul.member-list');
    let users = $(user_list).children('li');
    let ascending = true;
    let last_sort = '';

    let columns = ['desk', 'lvl', 'days', 'status', 'member-icons'].forEach((column) => {
        $('ul.title-black > li.'+column).addClass('headerSortable');
        $('ul.title-black > li.'+column).on('click', function() {
            if (column != last_sort) ascending = true;
            last_sort = column;
            users = doSort(users, column, ascending);
            ascending = !ascending;
            $(user_list).append(users);
        });
    });
}

// Stocks
function addStocklistSort() {
    let stock_list = $('ul.stock-list');
    let stocks = $(stock_list).children('li');
    let ascending = true;
    let last_sort = '';

    let columns = ['name', 'price', 'change', 'owned'].forEach((column) => {
        $('div.title-black > ul.title > li.'+column).addClass('headerSortable');
        $('div.title-black > ul.title > li.'+column).on('click', function() {
            if (column != last_sort) ascending = true;
            last_sort = column;
            stocks = doSort(stocks, column, ascending, 'div.title-black > ul.title > li.');
            ascending = !ascending;
            $(stock_list).append(stocks);
        });
    });
}

(function() {
    'use strict';

    // Your code here...
    ajax((page, json, uri) => {
        if (page == "userlist") {
            $('ul.user-info-blacklist-wrap').ready(addUserlistSort);
        } else if (page == "factions") {
            $('ul.member-list').ready(addMemberlistSort);
        } else if (page == "stockexchange") {
            $('ul.stock-list').ready(addStocklistSort);
        }
    });

    //$('ul.container-body-list').ready(a);
    if ($(location).attr('href').includes('factions.php')) {
        $('ul.member-list').ready(addMemberlistSort);
    } else if ($(location).attr('href').includes('stockexchange.php')) {
        $('ul.stock-list').ready(addStocklistSort);
    }
})();
