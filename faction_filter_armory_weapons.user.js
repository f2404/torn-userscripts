// ==UserScript==
// @name         Torn: Faction: Filter armory weapons
// @namespace    lugburz.faction.filter_armory_weapons
// @version      0.1
// @description  Filter weapons by type in faction armory.
// @author       Lugburz
// @match        https://www.torn.com/factions.php?step=your*
// @require      https://greasyfork.org/scripts/390917-dkk-torn-utilities/code/DKK%20Torn%20Utilities.js?version=744690
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

function showHideWeapons(checked, name) {
    $(".item-list > li").each(function(index) {
        let type = $(this).find(".type");
        if (typeof type !== 'undefined' && type !== null && name.localeCompare($(type).text()) == 0) {
            if (checked) {
                $(this).show();
            } else {
                $(this).hide();
            }
        }
    });
}

function addCheckboxes() {
    if (!$(location).attr('href').includes('sub=weapons')) {
        return;
    }

    let primCB = '<input type="checkbox" id="weapon-primary" name="Primary"><label for="Primary"> Primary </label>';
    let secondCB = '<input type="checkbox" id="weapon-secondary" name="Secondary"><label for="Secondary"> Secondary </label>';
    let meleeCB = '<input type="checkbox" id="weapon-melee" name="Melee"><label for="Melee"> Melee </label>';
    let myDiv = '<div class="title-black top-round t-overflow"><span>Show weapon types: </span>' + primCB + secondCB + meleeCB + '</div';
    $("div.armoury-tabs").prepend(myDiv);

    let types = ['primary', 'secondary', 'melee'];
    types.forEach(function(item, index, array) {
        let id = 'weapon-' + item;

        if (GM_getValue(id) == "0") {
            $("#"+id).prop("checked", false);
        } else {
            $("#"+id).prop("checked", true);
        }

        showHideWeapons($("#"+id).prop("checked"), $("#"+id).attr("name"));

        $("#"+id).change(function() {
            GM_setValue(id, this.checked);
            showHideWeapons(this.checked, $(this).attr("name"));
        });
    });
};

(function() {
    'use strict';

    // Your code here...
    ajax((page, json, uri) => {
        if (page != "factions" || !json) return;
        $("#armory-weapons").ready(addCheckboxes);
    });

    $("#armoury-weapons").ready(addCheckboxes);
})();
