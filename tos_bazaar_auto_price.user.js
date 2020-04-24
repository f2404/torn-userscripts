// ==UserScript==
// @name         Bazaar Auto Price
// @namespace    tos
// @version      0.7.3
// @description  Auto set bazaar prices on money input field click.
// @author       tos, Lugburz
// @match        *.torn.com/bazaar.php*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

const apikey = ''

const torn_api = async (args) => {
  const a = args.split('.')
  if (a.length!==3) throw(`Bad argument in torn_api(args, key): ${args}`)
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest ( {
      method: "POST",
      url: `https://api.torn.com/${a[0]}/${a[1]}?selections=${a[2]}&key=${apikey}`,
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

var event = new Event('keyup')
var APIERROR = false

async function lmp(itemID) {
  if(APIERROR === true) return 'API key error'
  const prices = await torn_api(`market.${itemID}.bazaar`)
  if (prices.error) {APIERROR = true; return 'API key error'}
  let lowest_market_price = null
  let SEprices = null
  for (const market in prices) {
    for (const lid in prices[market]) {
      if (lowest_market_price === null) lowest_market_price = prices[market][2].cost
      else if (prices[market][lid].cost < lowest_market_price) lowest_market_price = prices[market][2].cost
        if (SEprices === null) SEprices = prices[market][0].cost
      else if (prices[market][0].cost < SEprices) SEprices = prices[market][0].cost
    }
  }
     if(itemID === '106' || itemID === '329' || itemID === '330' || itemID === '331' || itemID === '283' || itemID === '336' || itemID === '428' || itemID === '588' ||
        itemID === '240' || itemID === '367' || itemID === '654' || itemID === '332' || itemID === '652' || itemID === '334' || itemID === '653')
     {
         return SEprices
     }
    else return lowest_market_price - 5
}

// HACK to simulate input value change
// https://github.com/facebook/react/issues/11488#issuecomment-347775628
function reactInputHack(inputjq, value) {
    // get js object from jquery
    const input = $(inputjq).get(0);

    let lastValue = 0;
    input.value = value;
    let event = new Event('input', { bubbles: true });
    // hack React15
    event.simulated = true;
    // hack React16 内部定义了descriptor拦截value，此处重置状态
    let tracker = input._valueTracker;
    if (tracker) {
        tracker.setValue(lastValue);
    }
    input.dispatchEvent(event);
}

function addOneFocusHandler(elem, itemID) {
    $(elem).on('focus', function(e) {
        this.value = '';
        if (this.value === '') {
            lmp(itemID).then((price) => {
                //this.value = price;
                reactInputHack(this, price);
                this.dispatchEvent(event);
                if(price) $(elem).off('focus');
            });
        }
    });
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
        if (typeof node.classList !== 'undefined' && node.classList) {
            let input = $(node).find('[class^=priceInput]');
            if ($(input).size() > 0) {
                // Manage items
                $(input).each(function() {
                    const img = $(this).parent().parent().find('img');
                    const itemID = $(img).attr('src').split('items/')[1].split('/medium')[0];
                    addOneFocusHandler($(this), itemID);
                });
            } else {
                // Add items
                input = node.querySelector('.input-money[type=text]');
                const img = node.querySelector('img');
                if (input && img) {
                    const itemID = img.src.split('items/')[1].split('/medium')[0];
                    addOneFocusHandler($(input), itemID);

                    // input amount
                    const input_amount = $(node).find('div.amount').find('.clear-all[type=text]');
                    const inv_amount = $(node).find('div.name-wrap').find('span.t-hide').text();
                    const amount = inv_amount == '' ? 1 : inv_amount.replace('x', '').trim();
                    $(input_amount).on('focus', function() {
                        reactInputHack(input_amount, amount);
                    });
                }
            }
        }
    }
  }
});

const wrapper = document.querySelector('#bazaarroot')
observer.observe(wrapper, { subtree: true, childList: true })
