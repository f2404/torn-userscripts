// ==UserScript==
// @name         Torn: Bounties: Hide friends and faction
// @namespace    lugburz.bounties.hide_friends_and_faction
// @version      0.2
// @description  Add an option to hide friends and faction from bounties.
// @author       Lugburz
// @match        https://www.torn.com/bounties.php*
// @match        https://www.torn.com/friendlist.php*
// @require      https://github.com/f2404/torn-userscripts/raw/master/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/bounties_hide_friends_and_faction.user.js
// @downloadURL  https://github.com/f2404/torn-userscripts/raw/master/bounties_hide_friends_and_faction.user.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

const apikey = '';

const torn_api = async () => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest ( {
      method: "POST",
      url: `https://api.torn.com/faction/?selections=basic&key=${apikey}`,
      headers: {
        "Content-Type": "application/json"
      },
      onload: (response) => {
          try {
            const resjson = JSON.parse(response.responseText)
            resolve(resjson)
          } catch(err) {
            reject(err)
          }
      },
      onerror: (err) => {
        reject(err)
      }
    })
  })
}

var APIERROR = false;
var DATA = "";

async function getFactionMembers() {
    if (APIERROR) return 'API key error';
    if (DATA) {
        console.log('Using cached faction members data');
        return DATA;
    }

    const data = await torn_api();
    if (data.error) {
        APIERROR = true;
        console.log('API key error');
        return 'API key error';
    }

    DATA = data;
    console.log('Got faction members data');

    return DATA;
}

function loadFriends() {
    return GM_getValue('friendlist') && GM_getValue('friendlist').split(',') || [];
}

function showHideItems(checked, id) {
    const list = $('#mainContainer').find('ul.bounties-list');
    const friends = loadFriends();

    getFactionMembers().then(data => {
        for (const mid in data.members) {
            $(list).children('li').each(function() {
                let userid = $(this).find('ul.item > li.b-info-wrap.head > div.target.left > a').attr('href');
                if (userid) {
                    userid = userid.replace('profiles.php?XID=', '').trim();
                    if ((userid === mid || friends.includes(userid)) && checked) {
                        $(this).attr('friendorfaction', 1);
                        $(this).hide();
                    } else if ((userid === mid || friends.includes(userid)) && $(this).attr('friendorfaction') === '1') {
                        $(this).attr('friendorfaction', 0);
                        $(this).show();
                    }
                }
            });
        }
    });
}

function addCheckbox() {
    const id = "hide-faction";

    if ($('#mainContainer').find('div.bounties-cont').size() < 1) {
        return;
    }
    if ($("#"+id).size() < 1) {
        const div = '<div class="title-black top-round t-overflow"><input type="checkbox" style="margin-left: 5px; margin-right: 5px" id="hide-faction" name="Hide faction">' +
              '<label for="Hide faction">Hide friends and faction</label></div>';
        $('#mainContainer').find('div.bounties-cont').prepend(div);
    }

    if (GM_getValue(id)) {
        $("#"+id).prop("checked", true);
    } else {
        $("#"+id).prop("checked", false);
    }

    showHideItems($("#"+id).prop("checked"), id);

    $("#"+id).change(function() {
        GM_setValue(id, this.checked);
        showHideItems(this.checked, id);
    });
}

function parseFriendlist() {
    const list = $('#mainContainer').find('div.blacklist').find('ul.user-info-blacklist-wrap');
    if ($(list).size() < 1) {
        return;
    }

    const friends = loadFriends();

    $(list).children('li').each(function() {
        let userid = $(this).find('a.user.name').attr('href');
        if (userid) {
            userid = userid.replace('/profiles.php?XID=', '').trim();
            if (!friends.includes(userid)) {
                friends.push(userid);
            }
        }
    });

    GM_setValue('friendlist', friends.join(','));
    console.log('Friendlist saved');
}

(function() {
    'use strict';

    // Your code here...
    ajax(page => {
        if (page === 'bounties') addCheckbox();
        else if (page === 'userlist') parseFriendlist();
    });

    addCheckbox();
    parseFriendlist();
})();
