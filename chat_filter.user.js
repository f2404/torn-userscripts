// ==UserScript==
// @name         Chat: Filter
// @namespace    lugburz.filter_chat
// @version      0.2
// @description  Add filtering by keyword to chats (Global, Trade, Faction, Travel).
// @author       Lugburz
// @match        https://www.torn.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

function filter(content, keyword) {
    const msgs = $(content).find('div[class^=message_]');
    $(msgs).each(function() {
        const msg = $(this).text();
        if (msg.toLowerCase().includes(keyword.toLowerCase()))
            $(this).show();
        else
            $(this).hide();
    });
}

function addChatFilter(box, chat) {
    const content = $(box).find('div[class^=chat-box-content_]');
    const filter_name = 'filter-' + chat;

    if ($(box).find('#'+filter_name).size() > 0) {
        $('#'+filter_name).val(GM_getValue(filter_name));
        const keyword = $('#'+filter_name).val();
        filter(content, keyword);

        return;
    }

    const input = $(box).find('div[class^=chat-box-input_]');
    $(input).prepend('<div><span style="vertical-align: middle; padding: 10px;"><label for="filter" style="color: green;">Filter: </label>' +
                     '<input type="text" id="' + filter_name + '" name="' + filter_name + '"></span></div>');

    $(content).bind('DOMNodeInserted DOMNodeRemoved', function() {
        $('#'+filter_name).val(GM_getValue(filter_name));
        const keyword = $('#'+filter_name).val();
        filter(content, keyword);
    });

    $('#'+filter_name).on('input', function() {
        const keyword = $('#'+filter_name).val();
        GM_setValue(filter_name, keyword);
        filter(content, keyword);
    });
}

(function() {
    'use strict';

    // Your code here...
    const chats = ['global', 'trade', 'faction', 'travel'];
    chats.forEach(function(chat) {
        const box = $('#chatRoot').find('div[class^=chat-box_][class*='+chat+'_]');
        $(box).bind('DOMNodeInserted', function() {
            $(box).ready(addChatFilter(box, chat));
        });
    });
})();
