// ==UserScript==
// @name         Torn: Faction: Payday made easy
// @namespace    lugburz.faction.payday_made_easy
// @version      0.3.3
// @description  Pay out cash directly from the crime results page.
// @author       Lugburz [2386297]
// @match        https://www.torn.com/factions.php?step=your*
// @require      https://raw.githubusercontent.com/f2404/torn-userscripts/e3bb87d75b44579cdb6f756435696960e009dc84/lib/lugburz_lib.js
// @updateURL    https://github.com/f2404/torn-userscripts/raw/master/faction_payday_made_easy.user.js
// @downloadURL  https://github.com/f2404/torn-userscripts/raw/master/faction_payday_made_easy.user.js
// @grant        none
// ==/UserScript==

// Crimes to pay out: array of integers. PA is 8, PH is 7, etc.
const CRIMES = [8, 7];

// Default settings
const DEFAULTS = {
    8: { // PA
        tax: 0, // faction tax (percentage of total PA earnings)
        even: true, // even payouts, or
        percentages: new Array(4).fill(100/4) // individual percentages
    },
    7: { // PH
        tax: 0,
        even: true,
        percentages: new Array(8).fill(100/8)
    },
    ignored: [], // members that do not get paid: array of user ids
    payday: true // pay day or add to balance links
};

function addSettings(crime, criminals, successDiv) {
    let storage = window.localStorage.getItem('payDaySettings');
    if (!storage) {
        window.localStorage.setItem('payDaySettings', JSON.stringify(DEFAULTS));
        storage = window.localStorage.getItem('payDaySettings');
    }

    const settings = JSON.parse(storage) || DEFAULTS;
    const crimeSettings = settings[crime] || DEFAULTS[crime];
    if (!crimeSettings) {
        return;
    }

    if ($('#payDaySettings').size()) {
        $('#payDaySettings').remove();
    }

    let div = '<div id="payDaySettings" style="padding: 10px; line-height: 24px;">';

    div += '<label for="tax-select">Faction tax: </label><select name="factionTax" id="tax-select">';
    for (let i = 0; i <= 50; i += 5) div += `<option value=${i} ${i === +crimeSettings.tax ? 'selected' : ''}>${i}%</option>`;
    div += '</select>';

    div += '<label for="even-payouts"> Even payouts </label><input id="even-payouts" type="checkbox"><label for="show-payday"> Switch between pay day and add to balance links </label><input id="show-payday" type="checkbox"><div>';
    criminals.forEach((id, index) => {
        const sum = calcPayout(successDiv, 0, crimeSettings.percentages[index]); // don't need to count faction tax here
        const percSum = crimeSettings.percentages.reduce((x, y) => +x + +y) + +crimeSettings.tax;
        div += `<div>&nbsp;&nbsp;${findName(successDiv, id)}: <select name="percentage-${id}" ${crimeSettings.even ? 'disabled' : ''} ${percSum > 100 ? 'style="color: red"' : ''} value="${(100 - +crimeSettings.tax) / criminals.length}%">`;
        div += `<option value="none" selected disabled hidden>${(100 - +crimeSettings.tax) / criminals.length}%</option>`;
        for (let i = 0; i <= 100; i += 5) div += `<option value=${i} ${i === +crimeSettings.percentages[index] ? 'selected' : ''}>${i}%</option>`;
        div += `</select><label for="ignore-${id}"> Don't pay </label><input id="ignore-${id}" type="checkbox"><a class="t-blue c-pointer ${settings.ignored.includes(id) ? 'hide' : ''}" target="_blank" `;
        if (settings.payday) {
            div += `href="https://www.torn.com/factions.php?step=your&type=1#/tab=controls&option=pay-day&select=${id}&pay=${sum}"> Go to Pay Day to pay out $${numberFormat(sum)}`;
        } else {
            div += `href="https://www.torn.com/factions.php?step=your#/tab=controls&addMoneyTo=${id}&money=${sum}"> Add $${numberFormat(sum)} to the balance`;
        }
        div += '</a></div>';
    });
    div += '</div>';

    if (crimeSettings.even && settings.payday) {
        const payTo = criminals.filter(id => !settings.ignored.includes(id));
        const sum = calcPayout(successDiv, crimeSettings.tax, 100 / criminals.length);
        const total = sum * payTo.length;
        div += `<div id="payDayLink">OR<br>
            <a class="t-blue c-pointer" target="_blank" href="https://www.torn.com/factions.php?step=your&type=1#/tab=controls&option=pay-day&select=${payTo}&pay=${sum}">Go to Pay Day to pay out $${numberFormat(total)} total</a>
            </div>`;
    }

    div += '</div';

    successDiv.prepend(div);

    $('#tax-select').change(function() {
        crimeSettings.tax = $(this).val();
        if (crimeSettings.even) {
            crimeSettings.percentages = new Array(criminals.length).fill((100 - +crimeSettings.tax) / criminals.length);
        }
        saveAndRedraw(successDiv, settings, crime, criminals);
    });

    $('#even-payouts').prop('checked', crimeSettings.even);
    $('#even-payouts').change(function() {
        crimeSettings.even = $(this).prop('checked');
        if (crimeSettings.even) {
            crimeSettings.percentages = new Array(criminals.length).fill((100 - +crimeSettings.tax) / criminals.length);
        }
        saveAndRedraw(successDiv, settings, crime, criminals);
    });

    $('#show-payday').prop('checked', settings.payday);
    $('#show-payday').change(function() {
        settings.payday = $(this).prop('checked');
        saveAndRedraw(successDiv, settings, crime, criminals);
    });

    criminals.forEach((id, index) => {
        $(`select[name=percentage-${id}]`).change(function() {
            crimeSettings.percentages[index] = $(this).val();
            saveAndRedraw(successDiv, settings, crime, criminals);
        });

        $(`#ignore-${id}`).prop('checked', settings.ignored.includes(id));
        $(`#ignore-${id}`).change(function() {
            const ignored = $(this).prop('checked');
            if (ignored && !settings.ignored.includes(id)) settings.ignored.push(id);
            else if (!ignored && settings.ignored.includes(id)) settings.ignored = settings.ignored.filter(ign => ign !== id);
            saveAndRedraw(successDiv, settings, crime, criminals);
        });
    });
}

function saveAndRedraw(successDiv, settings, crime, criminals) {
    window.localStorage.setItem('payDaySettings', JSON.stringify(settings));
    addSettings(crime, criminals, successDiv);
}

function calcPayout(successDiv, tax, percentage) {
    const cash = findCash(successDiv);
    const payout = cash * (1 - tax / 100) * percentage / 100;
    return payout;
}

function findCash(successDiv) {
    let cash = 0;
    successDiv.find('div.make-wrap').each((_, made) => {
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

function findName(successDiv, id) {
    let name;
    $(successDiv).find('a').each((_, a) => {
        if ($(a).attr('href').endsWith(`XID=${id}`)) {
            name = $(a).text();
            return false;
        }
    });
    return name;
}

function parseResult() {
    const hash = new URLSearchParams(window.location.hash);
    if ($('#option-pay-day').size() && hash.has('select') && hash.has('pay') && !$('#payBtn').size()) {
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
    if (!result || $('#payBtn').size() || $('#payDaySettings').size()) {
        return;
    }

    let crime, criminals, successDiv;
    try {
        crime = +result.attr('data-crime');
        criminals = JSON.parse(result.attr('data-criminals'));
        successDiv = result.find('div.success');
    } catch (e) {
        return;
    }

    if (!CRIMES.includes(crime) || !successDiv || !criminals) {
        return;
    }

    addSettings(crime, criminals, successDiv);
}

(function() {
    'use strict';

    // Your code here...
    ajax(page => {
        if (page === 'factions') parseResult();
    });
    setTimeout(() => parseResult(), 500);
})();
