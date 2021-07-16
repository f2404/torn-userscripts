// ==UserScript==
// @name         Torn: Miniprofile: Show last action
// @namespace    lugburz.miniprofile.show_last_action
// @version      0.1.4
// @description  Show last action in miniprofile.
// @author       Lugburz
// @match        https://www.torn.com/*
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/miniprofile_show_last_action.user.js
// @grant        unsafeWindow
// ==/UserScript==

function secondsToDhms(seconds) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600*24));
    var h = Math.floor(seconds % (3600*24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);

    var dDisplay = d > 0 ? d + "d " : "";
    var hDisplay = d > 0 || h > 0 ? h + "h " : "";
    var mDisplay = d > 0 || h > 0 || m > 0 ? m + "m " : "";
    var sDisplay = s > 0 ? s + "s" : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

var lastAction = '';

// intercept miniprofile fetch() responses
const constantMock = unsafeWindow.fetch;
unsafeWindow.fetch = function() {
    return new Promise((resolve, reject) => {
        constantMock.apply(this, arguments).then((response) => {
            if (response.url.indexOf('/profiles.php?step=getUserNameContextMenu') > -1) {
                const response2 = response.clone();
                response2.text().then(function (text) {
                    try {
                        const json = JSON.parse(text);
                        console.log('userID=' + json.user.userID + ' lastAction=' + json.user.lastAction.seconds);
                        lastAction = json.user.lastAction.seconds != 'Unknown' ? secondsToDhms(json.user.lastAction.seconds) + ' ago' : json.user.lastAction.seconds;
                        if ($('#miniProfileLastAction').size() > 0) {
                            $('#miniProfileLastAction').text(lastAction);
                        }
                    } catch (e) {
                        console.log(e);
                    }
                });
            }
            resolve(response);
        });
    });
}

const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        const newNodes = mutation.addedNodes;
        if (newNodes) {
            $(newNodes).each(function() {
                if ($(this).attr('id') && $(this).attr('id') == 'profile-mini-root') {
                    observer.disconnect();
                    observer.observe($('#profile-mini-root').get(0), { subtree: true, childList: true });
                } else if ($(this).attr('class') && $(this).attr('class').indexOf('profile-mini-_userProfileWrapper___') > -1) {
                    let id = $(this).find('div[class^=profile-mini-_userWrap__]').find('a').attr('href');
                    if (id) {
                        id = id.replace(/\/?profiles.php\?XID=/, '');
                        $(this).append('<div style="color: #555;  font-size: 12px; line-height: 14px;""><b>Last action:</b> <span id="miniProfileLastAction"></span></div>');
                        if (lastAction) {
                            $('#miniProfileLastAction').text(lastAction);
                            lastAction = '';
                        }
                    }
                }
            });
        }
    });
});

(function() {
    'use strict';

    // Your code here...
    const wrapper = $('#body');
    observer.observe($(wrapper).get(0), { subtree: true, childList: true });
})();
