// ==UserScript==
// @name         Torn: Faction: Payday made easy
// @namespace    lugburz.faction.payday_made_easy
// @version      0.2.2
// @description  Pay out PA cash directly from the crime results page.
// @author       Lugburz [2386297]
// @match        https://www.torn.com/factions.php?step=your*
// @require      https://raw.githubusercontent.com/f2404/torn-userscripts/e3bb87d75b44579cdb6f756435696960e009dc84/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/faction_payday_made_easy.user.js
// @downloadURL  https://github.com/f2404/torn-userscripts/raw/master/faction_payday_made_easy.user.js
// @grant        none
// ==/UserScript==

// Faction tax (fraction of total PA earnings)
const TAX = 0.1;
// Crimes to pay out: array of integers. PA is 8, PH is 7, etc.
const CRIMES = [8];
// Members that do not get paid: array of user ids
const IGNORED = [];

function findCash(result) {
    let cash = 0;
    result.find('div.make-wrap').each((_, made) => {
        $(made).find('p').each((_, p) => {
            const text = $(p).text();
            if (/\+ \$\S+ made/.test(text)) {
                cash = text.replace('+ $', '').replace(' made', '').replace(/,/g, '');
                return false;
            }
        });
    });
    return +cash;
}

function onPayBtnClick(successDiv, sum, criminals) {
    successDiv.find('.payment-cont').removeClass('hide');
    successDiv.find('.payment-cont').find('a.no').on('click', () => successDiv.find('.payment-cont').addClass('hide'));
    successDiv.find('.payment-cont').find('a.yes').on('click', () => {
        getAction({
          action: '/factions.php',
          type: 'post',
          data: {
              step: 'controlsPayDay',
              members: criminals,
              value: sum
          },
          success: function (str) {
              try {
                  const msg = JSON.parse(str);
                  successDiv.find('.payment-cont').html(`<span class="${msg.success ? 't-green' : 't-red'} bold">${msg.text}</span>`);
              } catch (e) {
                  successDiv.find('.payment-cont').html(str);
              }
          }
        });
    });
}

function parseResult() {
    const hash = new URLSearchParams(window.location.hash);
    if ($('#option-pay-day').size() && hash.has('select') && hash.has('pay')) {
        const criminals = hash.get('select').split(',');
        const sum = hash.get('pay');
        const member_amount = criminals.length;
        const total = sum * member_amount;
        const confirmText = `Are you sure you want to pay out <span class="bold">$${numberFormat(sum)}</span> to <span class="bold">${member_amount}</span> faction members (<span class="bold">$${numberFormat(total)}</span> total)?`;
        const span = `<span class="btn-wrap silver" style="padding: 10px;"><span class="btn"><button class="torn-btn" id="payBtn">PAY</button></span></span>
    <span class="payment-cont hide"><span class="confirm-info" style="padding-right: 10px;">${confirmText}</span><a class="t-blue c-pointer yes">Yes</a> / <a class="t-blue c-pointer no">No</a></span>`;
        $('#option-pay-day').prepend(span);
        $('#payBtn').on('click', () => onPayBtnClick($('#option-pay-day'), sum, criminals));
        return;
    }

    const result = $('#faction-crimes').find('div.crime-result');
    if (!result || $('#payBtn').size() || $('#payDayLink').size()) {
        return;
    }

    let crime, criminals, successDiv;
    try {
        crime = +result.attr('data-crime');
        criminals = JSON.parse(result.attr('data-criminals')).filter(cr => !IGNORED.includes(cr));
        successDiv = result.find('div.success');
    } catch (e) {
        return;
    }

    if (!CRIMES.includes(crime) || !successDiv || !criminals) {
        return;
    }

    const cash = findCash(result);
    const member_amount = criminals.length;
    const sum = cash * (1 - TAX) / 4; // PA
    const total = sum * member_amount;
    let payDayLink = `<div id="payDayLink" style="padding: 10px; line-height: 24px;">
    <a class="t-blue c-pointer" href="https://www.torn.com/factions.php?step=your&type=1#/tab=controls&option=pay-day&select=${criminals}&pay=${sum}">Go to Pay Day to pay out $${numberFormat(total)}</a>
    <br><span>OR adjust people's balances:</span>`;
    criminals.forEach(id => payDayLink += `<br><a class="t-blue c-pointer" target="_blank" href="https://www.torn.com/factions.php?step=your#/tab=controls&addMoneyTo=${id}&money=${sum}">Add $${numberFormat(sum)} to ${id}'s balance</a>`);
    payDayLink += '</div>';
    successDiv.prepend(payDayLink);
}

(function() {
    'use strict';

    // Your code here...
    ajax(page => {
        if (page === 'factions') parseResult();
    });
})();
