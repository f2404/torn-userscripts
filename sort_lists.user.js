// ==UserScript==
// @name         Torn: Sort lists
// @namespace    lugburz.sort_lists
// @version      0.5.12
// @description  Sort lists (such as blacklist, friendlist, userlist, faction members, company employees, stocks) by various columns.
// @author       Lugburz
// @match        https://www.torn.com/blacklist.php*
// @match        https://www.torn.com/friendlist.php*
// @match        https://www.torn.com/userlist.php*
// @match        https://www.torn.com/page.php*
// @match        https://www.torn.com/factions.php*
// @match        https://www.torn.com/stockexchange.php*
// @match        https://www.torn.com/companies.php*
// @match        https://www.torn.com/joblist.php*
// @require      https://raw.githubusercontent.com/f2404/torn-userscripts/31f4faa6da771b7a16cf732c1a78970506effeeb/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/sort_lists.user.js
// @grant        GM_addStyle
// ==/UserScript==

GM_addStyle(`
.headerSortable {
  cursor: pointer;
}

.headerSortDown:before {
  content: " ▾" !important;
}

.headerSortUp:before {
  content: " ▴" !important;
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
    } else if ('title'.localeCompare(column) == 0 || 'desk'.localeCompare(column) == 0 ||
               'name'.localeCompare(column) == 0 || 'employee'.localeCompare(column) == 0 || 'member'.localeCompare(column) == 0) {
        let sortedByName = Array.prototype.sort.bind(items);
        sortedByName(function (a, b) {
            // works with honors enabled or disabled
            let aText = $(a).find('.name').find('img').attr('title') || $(a).find('.name:first').text();
            let bText = $(b).find('.name').find('img').attr('title') || $(b).find('.name:first').text();
            if (typeof aText !== 'undefined') aText = aText.trim().toLowerCase();
            if (typeof bText !== 'undefined') bText = bText.trim().toLowerCase();

            return compare(aText, bText, ascending);
        });
    } else if ('status'.localeCompare(column) == 0 || 'position'.localeCompare(column) == 0) {
        let sortedByStatus = Array.prototype.sort.bind(items);
        sortedByStatus(function (a, b) {
            let aText = $(a).find('.'+column).text().replace('Status:', '').trim();
            let bText = $(b).find('.'+column).text().replace('Status:', '').trim();

            return compare(aText, bText, ascending);
        });
    // 'Last Action' script support
    } else if ('member-icons'.localeCompare(column) == 0) {
        // Do not show arrows if no 'Last Action'
        if (!$(divPrefix+column).text() || !$(divPrefix+column).text().includes('Last Action'))
            return items;

        let sortedByLastAction = Array.prototype.sort.bind(items);
        sortedByLastAction(function (a, b) {
            let aText = $(a).find('.last-action').text().trim();
            let bText = $(b).find('.last-action').text().trim();

            let days = aText.match(/((\d+) day)?/)[2] || 0;
            let hours = aText.match(/((\d+) hour)?/)[2] || 0;
            let mins = aText.match(/((\d+) minute)?/)[2] || 0;
            let aMins = Number(days)*24*60 + Number(hours)*60 + Number(mins);

            days = bText.match(/((\d+) day)?/)[2] || 0;
            hours = bText.match(/((\d+) hour)?/)[2] || 0;
            mins = bText.match(/((\d+) minute)?/)[2] || 0;
            let bMins = Number(days)*24*60 + Number(hours)*60 + Number(mins);

            return compare(Number(aMins), Number(bMins), ascending);
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
    } else if ('rank'.localeCompare(column) == 0) {
        let sortedByStatus = Array.prototype.sort.bind(items);
        sortedByStatus(function (a, b) {
            let aText = $(a).find('.'+column).text().replace('Rank:', '').trim();
            let bText = $(b).find('.'+column).text().replace('Rank:', '').trim();

            return compare(aText, bText, ascending);
        });
    } else if ('effectiveness'.localeCompare(column) == 0) {
        let sortedByStatus = Array.prototype.sort.bind(items);
        sortedByStatus(function (a, b) {
            let aText = $(a).find('.'+column).attr('data-effectiveness');
            let bText = $(b).find('.'+column).attr('data-effectiveness');

            return compare(aText, bText, ascending);
        });
    } else {
        // shouldn't happen
        return items;
    }

    [ 'level', 'lvl', 'title', 'desk', 'name', 'days', 'status', 'member-icons', 'price', 'owned', 'change', 'member', 'position', 'employee', 'rank' ].forEach((elem) => {
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

// Blacklist, friendlist, userlist
function addUserlistSort() {
    let ascending = true;
    let last_sort = '';

    // for friendlist and blacklist
    let user_list = $('ul.user-info-blacklist-wrap');
    let users = $(user_list).children('li');

    // for userlist (search results)
    if (users.length == 0) {
        user_list = $('ul.user-info-list-wrap');
        users = $(user_list).children('li');
    }

    let columns = ['title', 'level', 'status'].forEach((column) => {
        $('div.title-black > div.'+column).addClass('headerSortable');
        $('div.'+column).on('click', function() {
            // discard old data
            if(!$(users).is(':visible')) {
                return;
            }

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
    let user_list = $('ul.table-body');
    let users = $(user_list).children('li');
    let ascending = true;
    let last_sort = '';

    let columns = ['member', 'lvl', 'position', 'days', 'status', 'member-icons'].forEach((column) => {
        $('ul.table-header > li.'+column).addClass('headerSortable');
        $('ul.table-header > li.'+column).on('click', function() {
            if (column != last_sort) ascending = true;
            last_sort = column;
            users = doSort(users, column, ascending, 'ul.table-header > li.');
            ascending = !ascending;
            $(user_list).append(users);
        });
    });
}

// Faction control (money & points)
function doFactionDepSort(items, column, ascending) {
    if ('name-money'.localeCompare(column) == 0 || 'name-points'.localeCompare(column) == 0) {
        let sortedByName = Array.prototype.sort.bind(items);
        sortedByName(function (a, b) {
            // avoid conflicts with other scripts
            if ($(a).find('.name:first').hasClass('btFaction') || $(b).find('.name:first').hasClass('btFaction')) return 0;
            if ($(a).attr('id') == 'surplusInfo' || $(a).attr('id') == 'surplusInfo1') return 0;
            if ($(b).attr('id') == 'surplusInfo' || $(b).attr('id') == 'surplusInfo1') return 0;

            // works with honors enabled or disabled
            let aText = $(a).find('.name').find('img').attr('title') || $(a).find('.name:first').text();
            let bText = $(b).find('.name').find('img').attr('title') || $(b).find('.name:first').text();
            if (typeof aText !== 'undefined') aText = aText.trim().toLowerCase();
            if (typeof bText !== 'undefined') bText = bText.trim().toLowerCase();

            return compare(aText, bText, ascending);
        });
    } else if ('money'.localeCompare(column) == 0 || 'points'.localeCompare(column) == 0) {
        let sortedByPrice = Array.prototype.sort.bind(items);
        sortedByPrice(function (a, b) {
            let aText = $(a).find('.'+column).attr('data-value');
            let bText = $(b).find('.'+column).attr('data-value');

            return compare(Number(aText), Number(bText), ascending);
        });
    }

    if (column.includes('money')) {
        $('div.money-wrap > div.userlist-wrapper > div.info > span.bold').removeClass('headerSortUp');
        $('div.money-wrap > div.userlist-wrapper > div.info > span.bold').removeClass('headerSortDown');

        if (ascending) {
            if ('name-money'.localeCompare(column) == 0) $('div.money-wrap > div.userlist-wrapper > div.info').find('span.bold:first').addClass('headerSortDown');
            else if ('money'.localeCompare(column) == 0) $('div.money-wrap > div.userlist-wrapper > div.info').find('span.bold.amount:first').addClass('headerSortDown');
        } else {
            if ('name-money'.localeCompare(column) == 0) $('div.money-wrap > div.userlist-wrapper > div.info').find('span.bold:first').addClass('headerSortUp');
            else if ('money'.localeCompare(column) == 0) $('div.money-wrap > div.userlist-wrapper > div.info').find('span.bold.amount:first').addClass('headerSortUp');
        }
    } else if (column.includes('points')) {
        $('div.point-wrap > div.userlist-wrapper > div.info > span.bold').removeClass('headerSortUp');
        $('div.point-wrap > div.userlist-wrapper > div.info > span.bold').removeClass('headerSortDown');

        if (ascending) {
            if ('name-points'.localeCompare(column) == 0) $('div.point-wrap > div.userlist-wrapper > div.info').find('span.bold:first').addClass('headerSortDown');
            else if ('points'.localeCompare(column) == 0) $('div.point-wrap > div.userlist-wrapper > div.info').find('span.bold.amount:first').addClass('headerSortDown');
        } else {
            if ('name-points'.localeCompare(column) == 0) $('div.point-wrap > div.userlist-wrapper > div.info').find('span.bold:first').addClass('headerSortUp');
            else if ('points'.localeCompare(column) == 0) $('div.point-wrap > div.userlist-wrapper > div.info').find('span.bold.amount:first').addClass('headerSortUp');
        }
    }

    return items;
}

function addFactionMoneyDepSort() {
    let user_list = $('ul.user-info-list-wrap.money-depositors');
    let users = $(user_list).children('li.depositor');
    let ascending = true;
    let last_sort = '';

    $('div.money-wrap > div.userlist-wrapper > div.info > span.bold').addClass('headerSortable');
    $('div.money-wrap > div.userlist-wrapper > div.info').find('span.bold:first').on('click', function() {
        if ('name-money' != last_sort) ascending = true;
        last_sort = 'name-money';
        users = doFactionDepSort(users, 'name-money', ascending);
        ascending = !ascending;
        $(user_list).append(users);
    });
    $('div.money-wrap > div.userlist-wrapper > div.info').find('span.bold.amount:first').on('click', function() {
        if ('money' != last_sort) ascending = true;
        last_sort = 'money';
        users = doFactionDepSort(users, 'money', ascending);
        ascending = !ascending;
        $(user_list).append(users);
    });
}
function addFactionPointsDepSort() {
    let user_list = $('ul.user-info-list-wrap.points-depositors');
    let users = $(user_list).children('li.depositor');
    let ascending = true;
    let last_sort = '';

    $('div.point-wrap > div.userlist-wrapper > div.info > span.bold').addClass('headerSortable');
    $('div.point-wrap > div.userlist-wrapper > div.info').find('span.bold:first').on('click', function() {
        if ('name-points' != last_sort) ascending = true;
        last_sort = 'name-points';
        users = doFactionDepSort(users, 'name-points', ascending);
        ascending = !ascending;
        $(user_list).append(users);
    });
    $('div.point-wrap > div.userlist-wrapper > div.info').find('span.bold.amount:first').on('click', function() {
        if ('points' != last_sort) ascending = true;
        last_sort = 'points';
        users = doFactionDepSort(users, 'points', ascending);
        ascending = !ascending;
        $(user_list).append(users);
    });
}
// ===

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

// Company (your company)
function addCompanylistSort() {
    let user_list = $('ul.employee-list');
    let users = $(user_list).children('li');
    let ascending = true;
    let last_sort = '';

    let columns = ['employee', 'days', 'effectiveness'].forEach((column) => {
        $('ul.employee-list-title > li.'+column).addClass('headerSortable');
        $('ul.employee-list-title > li.'+column).on('click', function() {
            if (column != last_sort) ascending = true;
            last_sort = column;
            users = doSort(users, column, ascending);
            ascending = !ascending;
            $(user_list).append(users);
        });
    });
}

// Joblist (someone else's company)
function addJoblistSort() {
    let user_list = $('ul.employees-list');
    let users = $(user_list).children('li');
    let ascending = true;
    let last_sort = '';

    let columns = ['employee', 'rank', 'lvl'].forEach((column) => {
        $('div.title-black > ul.title > li.'+column).addClass('headerSortable');
        $('div.title-black > ul.title > li.'+column).on('click', function() {
            if (column != last_sort) ascending = true;
            last_sort = column;
            users = doSort(users, column, ascending, 'div.title-black > ul.title > li.');
            ascending = !ascending;
            $(user_list).append(users);
        });
    });
}

(function() {
    'use strict';

    // Your code here...
    ajax((page) => {
        if (page == "userlist") {
            $('ul.user-info-blacklist-wrap').ready(addUserlistSort);
        } else if (page == "page") {
            $('ul.user-info-list-wrap').ready(addUserlistSort);
        } else if (page == "factions") {
            $('ul.member-list').ready(addMemberlistSort);

            if ($(location).attr('href').includes('tab=controls')) {
                $('ul.user-info-list-wrap.money-depositors').ready(addFactionMoneyDepSort);
                $('ul.user-info-list-wrap.points-depositors').ready(addFactionPointsDepSort);
            }
        } else if (page == "stockexchange") {
            $('ul.stock-list').ready(addStocklistSort);
        } else if (page == "companies") {
            $('ul.employee-list').ready(addCompanylistSort);
        } else if (page == "joblist") {
            $('ul.employees-list').ready(addJoblistSort);
        }
    });

    if ($(location).attr('href').includes('factions.php')) {
        $('ul.member-list').ready(addMemberlistSort);

        if ($(location).attr('href').includes('tab=controls')) {
            $('ul.user-info-list-wrap.money-depositors').ready(addFactionMoneyDepSort);
            $('ul.user-info-list-wrap.points-depositors').ready(addFactionPointsDepSort);
        }
    } else if ($(location).attr('href').includes('stockexchange.php')) {
        $('ul.stock-list').ready(addStocklistSort);
    } else if ($(location).attr('href').includes('companies.php')) {
        $('ul.employee-list').ready(addCompanylistSort);
    } else if ($(location).attr('href').includes('joblist.php')) {
        $('ul.employees-list').ready(addCompanylistSort);
    }
})();
