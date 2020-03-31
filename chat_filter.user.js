// ==UserScript==
// @name         Chat: Filter
// @namespace    lugburz.filter_chat
// @version      0.1
// @description  Add filtering by keyword to chats (Trade chat atm).
// @author       Lugburz
// @match        https://www.torn.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

function filter(content, keyword) {
    let msgs = $(content).find('div[class^=message_]');
    $(msgs).each(function() {
        let msg = $(this).text();
        if (msg.toLowerCase().includes(keyword.toLowerCase()))
            $(this).show();
        else
            $(this).hide();
    });
}

function addTradeFilter(box) {
    let filter_name = 'filter-trade';
    let title = $(box).find('div[class^=chat-box-title_]');
    if (title.size() > 0 && $(title).attr('title') == 'Trade') {
        if ($(box).find('#'+filter_name).size() > 0)
            return;

        let input = $(box).find('div[class^=chat-box-input_]');
        let content = $(box).find('div[class^=chat-box-content_]');
        $(input).prepend('<div><span style="vertical-align: middle; padding: 10px;"><label for="filter" style="color: green;">Filter: </label>' +
                         '<input type="text" id="' + filter_name + '" name="' + filter_name + '"></span></div>');
        $(content).bind('DOMNodeInserted DOMNodeRemoved', function() {
            $('#'+filter_name).val(GM_getValue(filter_name));
            let keyword = $('#'+filter_name).val();
            filter(content, keyword);
        });
        $('#'+filter_name).on('input', function() {
            let keyword = $('#'+filter_name).val();
            GM_setValue(filter_name, keyword);
            filter(content, keyword);
        });
    }
}

(function() {
    'use strict';

    // Your code here...
    let boxes = $('#chatRoot').find('div[class^=chat-box_]');
    $(boxes).each(function() {
        $(this).bind('DOMNodeInserted', function() {
            $(this).ready(addTradeFilter($(this)));
        });
    });
})();
