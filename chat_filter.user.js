// ==UserScript==
// @name         Torn: Filter chats
// @namespace    lugburz.filter_chat
// @version      0.2.8
// @description  Add filtering by keywords to chats. Use double quotes to apply AND rule and no quotes for OR rule; use ! to apply a NOT rule.
// @author       Lugburz
// @match        https://www.torn.com/*
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/chat_filter.user.js
// @downloadURL  https://github.com/f2404/torn-userscripts/raw/master/chat_filter.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

function parse(keyword) {
    if (keyword == null || keyword == '')
        return [null, null, null];

    const ands = keyword.match(/\"[^\""]*\"/g);
    if (ands != null) {
        for (let i=0; i<ands.length; i++) {
            keyword = keyword.replace(ands[i], '');
        }
    }

    keyword = keyword.trim();
    if (keyword == null || keyword == '')
        return [ands, null, null];

    let nots = [];
    let ors = [];
    const tmp = keyword.split(" ");
    if (tmp != null) {
        for (let i=0; i<tmp.length; i++) {
            if (tmp[i].startsWith('!') && tmp[i].length > 1)
                nots.push(tmp[i].substring(1));
            else
                ors.push(tmp[i]);
        }
    }

    return [ands, ors, nots];
}

function checkAnds(ands, msg) {
    if (ands && ands.length) {
        for (let i=0; i<ands.length; i++) {
            const el = ands[i].replace(/\"/g, '');
            if (!msg.toLowerCase().includes(el.toLowerCase()))
                return false;
        }
    }
    return true;
}

function checkOrs(ors, msg) {
    if (!ors || !ors.length)
        return true;

    for (let i=0; i<ors.length; i++) {
        if (msg.toLowerCase().includes(ors[i].toLowerCase()))
            return true;
    }
    return false;
}

function checkNots(nots, msg) {
    if (nots && nots.length) {
        for (let i=0; i<nots.length; i++) {
            if (msg.toLowerCase().includes(nots[i].toLowerCase()))
                return false;
        }
    }
    return true;
}

function filter(content, keyword) {
    const p = parse(keyword);
    const ands = p[0];
    const ors = p[1];
    const nots = p[2];

    const msgs = $(content).find('div[class^=_message_]');
    $(msgs).each(function() {
        const msg = $(this).text();
        if (checkAnds(ands, msg) && checkOrs(ors, msg) && checkNots(nots, msg))
            $(this).show();
        else
            $(this).hide();
    });
}

function addChatFilter(box, chat) {
    const content = $(box).find('div[class^=_chat-box-content_]');
    const filter_name = 'filter-' + chat;

    if ($(box).find('#'+filter_name).size() > 0) {
        $('#'+filter_name).val(GM_getValue(filter_name));
        const keyword = $('#'+filter_name).val();
        filter(content, keyword);

        return;
    }

    const input = $(box).find('div[class^=_chat-box-input_]');
    $(input).css('flex-direction', 'column').css('height', 'auto');
    $(input).prepend('<div><label for="filter" style="color: green;">Filter: </label><input type="text" id="' + filter_name + '" name="' + filter_name + '"></div>');

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
    $('#chatRoot').find('div[class^=_chat-box_]').each((i, box) => {
        const chat = $(box).find('div[class^=_chat-box-title_]').attr('title').replace(/%/g, '_');
        $(box).ready(addChatFilter(box, chat));
        $(box).bind('DOMNodeInserted', function() {
            $(box).ready(addChatFilter(box, chat));
        });
    });
})();
