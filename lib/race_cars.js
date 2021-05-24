// ==UserScript==
// @name         Torn: Racing skins library
// @namespace    lugburz.cars
// @version      0.0.1
// @description  Library of car items and available skins for Torn scripts.
// @author       Brainslug
// @exclude      *
// @grant        none
// ==/UserScript==

// list of Torn car items
const carItems = {
    chevrolet_cavalier: {
        id: "92",
        class: "D",
        name: "Chevrolet Cavalier"
    },
    reliant_robin: {
        id: "94",
        class: "E",
        name: "Reliant Robin"
    },
    peugeot_106: {
        id: "498",
        class: "E",
        name: "Peugeot 106"
    },
    volkswagen_beetle: {
        id: "91",
        class: "D",
        name: "Volkswagen Beetle"
    },
    classic_mini: {
        id: "495",
        class: "E",
        name: "Classic Mini"
    },
    vauxhall_corsa: {
        id: "500",
        class: "E",
        name: "Vauxhall Corsa"
    },
    renault_clio: {
        id: "499",
        class: "E",
        name: "Renault Clio"
    },
    vauxhall_astra_gsi: {
        id: "505",
        class: "D",
        name: "Vauxhall Astra GSI"
    },
    citroen_saxo: {
        id: "494",
        class: "E",
        name: "Citroen Saxo"
    },
    honda_civic: {
        id: "90",
        class: "E",
        name: "Honda Civic"
    },
    volkswagen_golf_gti: {
        id: "506",
        class: "D",
        name: "Volkswagen Golf GTI"
    },
    audi_s4: {
        id: "87",
        class: "B",
        name: "Audi S4"
    },
    alfa_romeo_156: {
        id: "502",
        class: "D",
		name: "Alfa Romeo 156"
	},
    honda_integra_r: {
        id: "88",
        class: "C",
		name: "Honda Integra R"
	},
    ford_mustang: {
        id: "93",
        class: "B",
		name: "Ford Mustang"
	},
    lotus_exige: {
		id: "512",
        class: "B",
		name: "Lotus Exige"
	},
    honda_accord: {
		id: "89",
        class: "D",
		name: "Honda Accord"
	},
    hummer_h3: {
		id: "86",
        class: "D",
		name: "Hummer H3"
	},
    honda_s2000: {
		id: "509",
        class: "C",
		name: "Honda S2000"
	},
    holden_ss: {
		id: "95",
        class: "C",
		name: "Holden SS"
	},
    toyota_mr2: {
		id: "77",
        class: "D",
		name: "Toyota MR2"
	},
    bmw_x5: {
		id: "503",
        class: "D",
		name: "BMW X5"
	},
    mini_cooper_s: {
		id: "510",
        class: "C",
		name: "Mini Cooper S"
	},
    honda_nsx: {
		id: "78",
        class: "A",
		name: "Honda NSX"
	},
    tvr_sagaris: {
		id: "516",
        class: "B",
		name: "TVR Sagaris"
	},
    bmw_m5: {
		id: "80",
        class: "B",
		name: "BMW M5"
	},
    subaru_impreza_sti: {
		id: "515",
        class: "B",
		name: "Subaru Impreza STI"
	},
    fiat_punto: {
		id: "496",
        class: "E",
		name: "Fiat Punto"
	},
    nissan_micra: {
		id: "497",
        class: "E",
		name: "Nissan Micra"
	},
    chevrolet_corvette_z06: {
		id: "82",
        class: "C",
		name: "Chevrolet Corvette Z06"
	},
    ford_focus_rs: {
		id: "508",
        class: "C",
		name: "Ford Focus RS"
	},
    audi_tt_quattro: {
		id: "79",
        class: "C",
		name: "Audi TT Quattro"
	},
    pontiac_firebird: {
		id: "84",
        class: "C",
		name: "Pontiac Firebird"
	},
    dodge_charger: {
		id: "83",
        class: "B",
		name: "Dodge Charger"
	},
    nissan_gtr: {
		id: "524",
        class: "A",
		name: "Nissan GT-R"
	},
    bmw_z8: {
		id: "81",
        class: "C",
		name: "BMW Z8"
	},
    porsche_911_gt3: {
		id: "514",
        class: "B",
		name: "Porsche 911 GT3"
	},
    ford_gt40: {
		id: "85",
        class: "A",
		name: "Ford GT40"
	},
    mitsubishi_evo_x: {
		id: "513",
        class: "B",
		name: "Mitsubishi Evo X"
	},
    volvo_850: {
		id: "501",
        class: "E",
		name: "Volvo 850"
	},
    audi_r8: {
		id: "518",
        class: "A",
		name: "Audi R8"
	},
    seat_leon_cupra: {
		id: "504",
        class: "D",
		name: "Seat Leon Cupra"
	},
    lexus_lfa: {
		id: "522",
        class: "A",
		name: "Lexus LFA"
	},
    lamborghini_gallardo: {
		id: "521",
        class: "A",
		name: "Lamborghini Gallardo"
	},
    ferrari_458: {
		id: "520",
        class: "A",
		name: "Ferrari 458"
	},
    mercedes_slr: {
		id: "523",
        class: "A",
		name: "Mercedes SLR"
	},
    aston_martin_one77: {
		id: "517",
        class: "A",
		name: "Aston Martin One-77"
	},
    sierra_cosworth: {
		id: "511",
        class: "B",
		name: "Sierra Cosworth"
	},
    audi_s3: {
		id: "507",
        class: "C",
		name: "Audi S3"
    }
};

// available car skins
const carSkins = {
	ford_gt40: [
		{ color: 'blue', id: 'pfD2Kwn' },
		{ color: 'light blue', id: 'GuXQYBe' },
		{ color: 'green', id: 'TzIQ3a5' },
		{ color: 'light green', id: '9tOPj5Q' },
		{ color: 'orange', id: 'xsvpWlC' },
		{ color: 'light orange', id: 'nqEOBAE' },
		{ color: 'pink', id: '8awdBqE' },
		{ color: 'light pink', id: 'pVbpELH' },
		{ color: 'red', id: 'HR9T9Hy' },
		{ color: 'purple', id: 'phOq7nb' },
		{ color: 'yellow', id: '5gBubcD' },
		{ color: 'grey', id: 'j0bNcgJ' },
	],
	ferrari_458: [
		{ color: 'blue', id: 'BdQwnpc' },
		{ color: 'light blue', id: 'RuGgabh' },
		{ color: 'green', id: 'Qq1qfI1' },
		{ color: 'light green', id: 'B431WaO' },
		{ color: 'orange', id: 'JqECoqU' },
		{ color: 'light orange', id: 'w33WwFq' },
		{ color: 'pink', id: 'U86dKQV' },
		{ color: 'light pink', id: 'O4iMsyc' },
		{ color: 'red', id: 'T3jAJSB' },
		{ color: 'purple', id: 'ZIgq5Bg' },
		{ color: 'yellow', id: '4c2oN9F' },
		{ color: 'grey', id: 'bqjmbSN' },
	],
	lexus_lfa: [
		{ color: 'blue', id: 'AJXScXJ' },
		{ color: 'light blue', id: '0csIYNC' },
		{ color: 'green', id: '93PWwy2' },
		{ color: 'light green', id: 'TOlNdIs' },
		{ color: 'orange', id: 'Vxub1Y9' },
		{ color: 'light orange', id: 'QTkIQIv' },
		{ color: 'pink', id: 'tRdmZlW' },
		{ color: 'light pink', id: 'YGpcKKX' },
		{ color: 'red', id: 'nXBSp8p' },
		{ color: 'purple', id: 'sKBtEF7' },
		{ color: 'yellow', id: 'hebAC2Z' },
		{ color: 'grey', id: 'oCygr8j' },
	],
}