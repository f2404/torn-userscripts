// ==UserScript==
// @name         Torn: Factions: Prettify Select/Clear All buttons
// @namespace    lugburz.faction.select_clear_button
// @version      0.1
// @description  Prettify Select/Clear All buttons on the faction Permissions page.
// @author       Lugburz
// @match        https://www.torn.com/factions.php?step=your*
// @require      https://greasyfork.org/scripts/390917-dkk-torn-utilities/code/DKK%20Torn%20Utilities.js?version=744690
// @grant        none
// ==/UserScript==

function replaceCBs(cbs) {
    $(cbs).each(function() {
        $(this).hide();

        let span = '<span class="clear-action t-blue h" style="cursor: pointer;">Select</span>'
        $(this).parent().append(span);

        let cb = $(this).find('input.checkbox-css');
        $(cb).prop('checked', true);

        $(this).parent().find('span.clear-action').on('click', function() {
            let cb_id = $(cb).attr('id');
            $('#'+cb_id).click();
            if ($(this).text() == 'Select') {
                $(this).text('Clear');
            } else {
                $(this).text('Select');
            }
        });
    });
}

function prettify() {
    if (!$(location).attr('href').includes('tab=controls')) {
        return;
    }

    let cbs = $('#select-all').find('div.choice-container');
    if (cbs.length > 0) {
        $('#select-all > div.permission-member').append('<span>All:</span>');

        // Add top row
        let row = $('li.select-all-wrap').clone();
        $(row).attr('id', 'select-all-top');
        $(row).find('input.checkbox-css').each(function() {
            let id = $(this).attr('id') + '-top';
            $(this).attr('id', id);
        });
        $('#permission-members-list').prepend($(row));

        replaceCBs(cbs);

        let cbs_top = $('#select-all-top').find('div.choice-container');
        replaceCBs(cbs_top);
    }
}

(function() {
    'use strict';

    // Your code here...
    ajax((page, json, uri) => {
        if (page != "factions") return;
        $('#select-all').ready(prettify);
    });
})();
