// ==UserScript==
// @name         Torn: Chats: Add maximize button
// @namespace    lugburz.chats.add_maximize_button
// @version      0.2.1
// @description  Add maximize button to all chat windows.
// @author       Lugburz
// @match        https://www.torn.com/*
// @grant        GM_addStyle
// ==/UserScript==

// Number of pixels to increase chat window dimensions by.
var WIDTH = 600;
var HEIGHT = 200;
// Whether or not to allow only one maximized chat window.
// If set to true, all other chat window will be unmaximized.
var ONLY_ONE = true;

GM_addStyle(`
.maximize_ {
  display: block;
  width: 26px !important;
  float: right;
  height: 34px;
  background: url(/images/v2/chat/tab_icons.svg);
  background-position-x: -582px;
}
`);

function isBoxVisible(box) {
    return $(box).find('div[class^=chat-box-content_]').size() > 0;
}

function isBoxMaximized(box) {
    const title = $(box).find('div[class^=chat-box-title_]');
    return $(title).find('div.maximize_').attr('maximized') > 0;
}

function unmaxAll() {
    const boxes = $('#chatRoot').find('div[class^=chat-box_]');
    $(boxes).each(function() {
        if (isBoxVisible($(this)) && isBoxMaximized($(this))) {
            maxUnmax($(this), false);
        }
    });
}

function maxUnmax(box, doMax) {
    const content = $(box).find('div[class^=chat-box-content_]');
    const textarea = $(box).find('textarea[class^=chat-box-textarea_]');
    const title = $(box).find('div[class^=chat-box-title_]');

    if (doMax) {
        $(box).width($(box).width() + WIDTH);
        $(content).width($(content).width() + WIDTH);
        $(content).height($(content).height() + HEIGHT);
        $(content).find('div[class^=viewport_]').height($(content).find('div[class^=viewport_]').height() + HEIGHT);
        $(content).find('div[class^=viewport_]').css('max-height', $(content).find('div[class^=viewport_]').height() + HEIGHT);
        $(textarea).width($(textarea).width() + WIDTH);
        $(title).parent().width($(title).parent().width() + WIDTH);
        $(title).parent().css("max-width", $(title).parent().width() + WIDTH);

        $(title).find('div.maximize_').attr('maximized', 1);
        $(title).find('div.maximize_').attr('title', 'Unmaximize chat');
    } else {
        $(box).css('width', 'auto');
        $(content).width($(content).width() - WIDTH);
        $(content).height($(content).height() - HEIGHT);
        $(content).find('div[class^=viewport_]').height($(content).find('div[class^=viewport_]').height() - HEIGHT);
        $(textarea).width($(textarea).width() - WIDTH);
        $(title).parent().width($(title).parent().width() - WIDTH);

        $(title).find('div.maximize_').attr('maximized', 0);
        $(title).find('div.maximize_').attr('title', 'Maximize chat');
    }
}

function addMaxButton(box, force=false) {
    const title = $(box).find('div[class^=chat-box-title_]');

    if ($(title).find('div.maximize_').size() == 0) {
        $(title).append('<div class="maximize_" title="Maximize chat"></div>');

        $(title).find('div.maximize_').on('click', function() {
            event.stopPropagation();
            if (isBoxMaximized(box)) {
                maxUnmax($(box), false);
            } else {
                if (ONLY_ONE)
                    unmaxAll();
                maxUnmax($(box), true);
            }
        });

        if (force || isBoxVisible(box)) {
            $(title).find('div.maximize_').show();
        } else {
            $(title).find('div.maximize_').hide();
        }
    }
}

function addOnClick(box) {
    const title = $(box).find('div[class^=chat-box-title_]');
    $(title).on('click', function() {
        if (!isBoxVisible(box)) {
            // chat is hidden -> showing
            $(title).find('div.maximize_').show();
        } else {
            // chat is shown -> hiding
            if (isBoxMaximized(box)) {
                $(box).css("width", "auto");
                $(title).find('div.maximize_').attr('maximized', 0);
                $(title).find('div.maximize_').attr('title', 'Maximize chat');
            }
            $(title).find('div.maximize_').hide();
        }
    });
}

const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if ($(node).find('div[class^=chat-box-title_]').size() > 0) {
                addMaxButton(node, true);
                addOnClick(node);
            }
        }
    }
});

(function() {
    'use strict';

    // Your code here...
    $('#chatRoot').ready(function() {
        const boxes = $('#chatRoot').find('div[class^=chat-box_]');
        $(boxes).each(function() {
            addMaxButton($(this));
            addOnClick($(this));
        });
    });

    const wrapper = document.querySelector('#chatRoot')
    observer.observe(wrapper, { subtree: true, childList: true })
})();
