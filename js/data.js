// Game data: the flag ladder, the economy formulas, and the upgrade and rebirth tables.
// A flag's tier is its index in FLAGS. Merging two flags of tier t makes one flag of tier t + 1.

export const FLAGS = [
  { name: 'Afghanistan',               code: 'af' },
  { name: 'Albania',                   code: 'al' },
  { name: 'Algeria',                   code: 'dz' },
  { name: 'Andorra',                   code: 'ad' },
  { name: 'Angola',                    code: 'ao' },
  { name: 'Antigua and Barbuda',       code: 'ag' },
  { name: 'Argentina',                 code: 'ar' },
  { name: 'Armenia',                   code: 'am' },
  { name: 'Australia',                 code: 'au' },
  { name: 'Austria',                   code: 'at' },
  { name: 'Azerbaijan',                code: 'az' },
  { name: 'Bahamas',                   code: 'bs' },
  { name: 'Bahrain',                   code: 'bh' },
  { name: 'Bangladesh',                code: 'bd' },
  { name: 'Barbados',                  code: 'bb' },
  { name: 'Belarus',                   code: 'by' },
  { name: 'Belgium',                   code: 'be' },
  { name: 'Belize',                    code: 'bz' },
  { name: 'Benin',                     code: 'bj' },
  { name: 'Bhutan',                    code: 'bt' },
  { name: 'Bolivia',                   code: 'bo' },
  { name: 'Bosnia and Herzegovina',    code: 'ba' },
  { name: 'Botswana',                  code: 'bw' },
  { name: 'Brazil',                    code: 'br' },
  { name: 'Brunei',                    code: 'bn' },
  { name: 'Bulgaria',                  code: 'bg' },
  { name: 'Burkina Faso',              code: 'bf' },
  { name: 'Burundi',                   code: 'bi' },
  { name: 'Cambodia',                  code: 'kh' },
  { name: 'Cameroon',                  code: 'cm' },
  { name: 'Canada',                    code: 'ca' },
  { name: 'Cape Verde',                code: 'cv' },
  { name: 'Central African Republic',  code: 'cf' },
  { name: 'Chad',                      code: 'td' },
  { name: 'Chile',                     code: 'cl' },
  { name: 'China',                     code: 'cn' },
  { name: 'Colombia',                  code: 'co' },
  { name: 'Comoros',                   code: 'km' },
  { name: 'Congo (Dem. Rep.)',         code: 'cd' },
  { name: 'Congo (Rep.)',              code: 'cg' },
  { name: 'Costa Rica',                code: 'cr' },
  { name: 'Croatia',                   code: 'hr' },
  { name: 'Cuba',                      code: 'cu' },
  { name: 'Cyprus',                    code: 'cy' },
  { name: 'Czech Republic',            code: 'cz' },
  { name: 'Denmark',                   code: 'dk' },
  { name: 'Djibouti',                  code: 'dj' },
  { name: 'Dominica',                  code: 'dm' },
  { name: 'Dominican Republic',        code: 'do' },
  { name: 'Ecuador',                   code: 'ec' },
  { name: 'Egypt',                     code: 'eg' },
  { name: 'El Salvador',               code: 'sv' },
  { name: 'Equatorial Guinea',         code: 'gq' },
  { name: 'Eritrea',                   code: 'er' },
  { name: 'Estonia',                   code: 'ee' },
  { name: 'Eswatini',                  code: 'sz' },
  { name: 'Ethiopia',                  code: 'et' },
  { name: 'Fiji',                      code: 'fj' },
  { name: 'Finland',                   code: 'fi' },
  { name: 'France',                    code: 'fr' },
  { name: 'Gabon',                     code: 'ga' },
  { name: 'Gambia',                    code: 'gm' },
  { name: 'Georgia',                   code: 'ge' },
  { name: 'Germany',                   code: 'de' },
  { name: 'Ghana',                     code: 'gh' },
  { name: 'Greece',                    code: 'gr' },
  { name: 'Grenada',                   code: 'gd' },
  { name: 'Guatemala',                 code: 'gt' },
  { name: 'Guinea',                    code: 'gn' },
  { name: 'Guinea-Bissau',             code: 'gw' },
  { name: 'Guyana',                    code: 'gy' },
  { name: 'Haiti',                     code: 'ht' },
  { name: 'Honduras',                  code: 'hn' },
  { name: 'Hungary',                   code: 'hu' },
  { name: 'Iceland',                   code: 'is' },
  { name: 'India',                     code: 'in' },
  { name: 'Indonesia',                 code: 'id' },
  { name: 'Iran',                      code: 'ir' },
  { name: 'Iraq',                      code: 'iq' },
  { name: 'Ireland',                   code: 'ie' },
  { name: 'Israel',                    code: 'il' },
  { name: 'Italy',                     code: 'it' },
  { name: 'Ivory Coast',               code: 'ci' },
  { name: 'Jamaica',                   code: 'jm' },
  { name: 'Japan',                     code: 'jp' },
  { name: 'Jordan',                    code: 'jo' },
  { name: 'Kazakhstan',                code: 'kz' },
  { name: 'Kenya',                     code: 'ke' },
  { name: 'Kiribati',                  code: 'ki' },
  { name: 'Kosovo',                    code: 'xk' },
  { name: 'Kuwait',                    code: 'kw' },
  { name: 'Kyrgyzstan',                code: 'kg' },
  { name: 'Laos',                      code: 'la' },
  { name: 'Latvia',                    code: 'lv' },
  { name: 'Lebanon',                   code: 'lb' },
  { name: 'Lesotho',                   code: 'ls' },
  { name: 'Liberia',                   code: 'lr' },
  { name: 'Libya',                     code: 'ly' },
  { name: 'Liechtenstein',             code: 'li' },
  { name: 'Lithuania',                 code: 'lt' },
  { name: 'Luxembourg',                code: 'lu' },
  { name: 'Madagascar',                code: 'mg' },
  { name: 'Malawi',                    code: 'mw' },
  { name: 'Malaysia',                  code: 'my' },
  { name: 'Maldives',                  code: 'mv' },
  { name: 'Mali',                      code: 'ml' },
  { name: 'Malta',                     code: 'mt' },
  { name: 'Marshall Islands',          code: 'mh' },
  { name: 'Mauritania',                code: 'mr' },
  { name: 'Mauritius',                 code: 'mu' },
  { name: 'Mexico',                    code: 'mx' },
  { name: 'Micronesia',                code: 'fm' },
  { name: 'Moldova',                   code: 'md' },
  { name: 'Monaco',                    code: 'mc' },
  { name: 'Mongolia',                  code: 'mn' },
  { name: 'Montenegro',                code: 'me' },
  { name: 'Morocco',                   code: 'ma' },
  { name: 'Mozambique',                code: 'mz' },
  { name: 'Myanmar',                   code: 'mm' },
  { name: 'Namibia',                   code: 'na' },
  { name: 'Nauru',                     code: 'nr' },
  { name: 'Nepal',                     code: 'np' },
  { name: 'Netherlands',               code: 'nl' },
  { name: 'New Zealand',               code: 'nz' },
  { name: 'Nicaragua',                 code: 'ni' },
  { name: 'Niger',                     code: 'ne' },
  { name: 'Nigeria',                   code: 'ng' },
  { name: 'North Korea',               code: 'kp' },
  { name: 'North Macedonia',           code: 'mk' },
  { name: 'Norway',                    code: 'no' },
  { name: 'Oman',                      code: 'om' },
  { name: 'Pakistan',                  code: 'pk' },
  { name: 'Palau',                     code: 'pw' },
  { name: 'Palestine',                 code: 'ps' },
  { name: 'Panama',                    code: 'pa' },
  { name: 'Papua New Guinea',          code: 'pg' },
  { name: 'Paraguay',                  code: 'py' },
  { name: 'Peru',                      code: 'pe' },
  { name: 'Philippines',               code: 'ph' },
  { name: 'Poland',                    code: 'pl' },
  { name: 'Portugal',                  code: 'pt' },
  { name: 'Qatar',                     code: 'qa' },
  { name: 'Romania',                   code: 'ro' },
  { name: 'Russia',                    code: 'ru' },
  { name: 'Rwanda',                    code: 'rw' },
  { name: 'Saint Kitts and Nevis',     code: 'kn' },
  { name: 'Saint Lucia',               code: 'lc' },
  { name: 'Saint Vincent',             code: 'vc' },
  { name: 'Samoa',                     code: 'ws' },
  { name: 'San Marino',                code: 'sm' },
  { name: 'São Tomé and Príncipe',     code: 'st' },
  { name: 'Saudi Arabia',              code: 'sa' },
  { name: 'Senegal',                   code: 'sn' },
  { name: 'Serbia',                    code: 'rs' },
  { name: 'Seychelles',                code: 'sc' },
  { name: 'Sierra Leone',              code: 'sl' },
  { name: 'Singapore',                 code: 'sg' },
  { name: 'Slovakia',                  code: 'sk' },
  { name: 'Slovenia',                  code: 'si' },
  { name: 'Solomon Islands',           code: 'sb' },
  { name: 'Somalia',                   code: 'so' },
  { name: 'South Africa',              code: 'za' },
  { name: 'South Korea',               code: 'kr' },
  { name: 'South Sudan',               code: 'ss' },
  { name: 'Spain',                     code: 'es' },
  { name: 'Sri Lanka',                 code: 'lk' },
  { name: 'Sudan',                     code: 'sd' },
  { name: 'Suriname',                  code: 'sr' },
  { name: 'Sweden',                    code: 'se' },
  { name: 'Switzerland',               code: 'ch' },
  { name: 'Syria',                     code: 'sy' },
  { name: 'Taiwan',                    code: 'tw' },
  { name: 'Tajikistan',                code: 'tj' },
  { name: 'Tanzania',                  code: 'tz' },
  { name: 'Thailand',                  code: 'th' },
  { name: 'Timor-Leste',               code: 'tl' },
  { name: 'Togo',                      code: 'tg' },
  { name: 'Tonga',                     code: 'to' },
  { name: 'Trinidad and Tobago',       code: 'tt' },
  { name: 'Tunisia',                   code: 'tn' },
  { name: 'Turkey',                    code: 'tr' },
  { name: 'Turkmenistan',              code: 'tm' },
  { name: 'Tuvalu',                    code: 'tv' },
  { name: 'Uganda',                    code: 'ug' },
  { name: 'Ukraine',                   code: 'ua' },
  { name: 'United Arab Emirates',      code: 'ae' },
  { name: 'United Kingdom',            code: 'gb' },
  { name: 'United States',             code: 'us' },
  { name: 'Uruguay',                   code: 'uy' },
  { name: 'Uzbekistan',                code: 'uz' },
  { name: 'Vanuatu',                   code: 'vu' },
  { name: 'Vatican City',              code: 'va' },
  { name: 'Venezuela',                 code: 've' },
  { name: 'Vietnam',                   code: 'vn' },
  { name: 'Yemen',                     code: 'ye' },
  { name: 'Zambia',                    code: 'zm' },
  { name: 'Zimbabwe',                  code: 'zw' },
];

export function flagSquare(tier) { return `assets/flags/1x1/${FLAGS[tier].code}.svg`; }
export function flagWide(tier)   { return `assets/flags/4x3/${FLAGS[tier].code}.svg`; }

// ── Economy ──────────────────────────────────────────────────────────────────
// income per flag per second = 2 * 2.5^tier
// merge cash bonus           = 80 * 2.2^tier
export function flagIncome(tier)     { return 2  * Math.pow(2.5, tier); }
export function flagMergeBonus(tier) { return 80 * Math.pow(2.2, tier); }

// ── Rebirth Table ────────────────────────────────────────────────────────────
// Sequential: Algeria (tier 2), Andorra (tier 3), Angola (tier 4), ...
// flagCount grows by 1 every 5 rebirths (caps at 7 — leaves room on a 10-slot board)
// cash grows ×5 each rebirth; mult is ×1.5 each time (stacks multiplicatively)
export const REBIRTHS = FLAGS.slice(2).map((_, i) => ({
  flagTier:  i + 2,
  flagCount: Math.min(5 + Math.floor(i / 5), 7),
  cash:      1_000_000 * Math.pow(5, i),
  mult:      1.5,
}));

// ── Upgrade Table ────────────────────────────────────────────────────────────
export const UPGRADES = [
  { id: 'merge1',  name: 'Merge Windfall I',  desc: '+25% merge cash', cost: 500,    requires: null,      icon: 'merge'  },
  { id: 'merge2',  name: 'Merge Windfall II', desc: '+25% merge cash', cost: 6_000,  requires: 'merge1',  icon: 'merge'  },
  { id: 'income1', name: 'Income Surge I',    desc: '+20% income/sec', cost: 2_000,  requires: null,      icon: 'income' },
  { id: 'income2', name: 'Income Surge II',   desc: '+20% income/sec', cost: 30_000, requires: 'income1', icon: 'income' },
  { id: 'slots',   name: 'Extra Slots',       desc: '+2 board slots',  cost: 50_000, requires: null,      icon: 'slots'  },
];

// ── Constants ────────────────────────────────────────────────────────────────
export const SLOT_COUNT_BASE = 10;
export const SLOT_COUNT_MAX  = 12;
export const START_CASH      = 100;
export const AUSTRIA_TIER    = 9;      // free flag after every rebirth
export const OFFLINE_CAP_SEC = 8 * 3600;
export const SAVE_KEY        = 'flagMixer_v1';

// ── Extras (new in this version; they sit on top of the core loop) ───────────
// Merge combo: each merge within COMBO_WINDOW_SEC of the last one adds COMBO_STEP
// to the merge cash, up to COMBO_MAX_STEPS steps (×1.5 at most).
export const COMBO_WINDOW_SEC = 3.5;
export const COMBO_STEP       = 0.10;
export const COMBO_MAX_STEPS  = 5;

// Lucky crate: drops into an empty slot now and then; tap it to open.
export const CRATE_FIRST_DELAY_SEC = 45;
export const CRATE_DELAY_MIN_SEC   = 75;
export const CRATE_DELAY_MAX_SEC   = 120;
export const CRATE_CASH_SECONDS    = 60;  // a cash prize is worth this many seconds of income
export const CRATE_CASH_MIN        = 200;
// Each prize: chance, then either a flag `tierBoost` above the shop tier, or cash.
export const CRATE_PRIZES = [
  { chance: 0.60, kind: 'flag', tierBoost: 0 },
  { chance: 0.20, kind: 'flag', tierBoost: 1 },
  { chance: 0.05, kind: 'flag', tierBoost: 2 },
  { chance: 0.15, kind: 'cash' },
];

// Rim colors by tier band: the medal around each flag gets fancier as tiers rise.
export const RARITIES = [
  { upTo: 2,        name: 'Bronze',   rim: ['#c98a4b', '#7a4a1f'] },
  { upTo: 5,        name: 'Silver',   rim: ['#eef2f7', '#8d98a8'] },
  { upTo: 8,        name: 'Gold',     rim: ['#ffe27a', '#c78a12'] },
  { upTo: 11,       name: 'Jade',     rim: ['#7cf2c0', '#13865a'] },
  { upTo: 14,       name: 'Sapphire', rim: ['#7fb6ff', '#1d4fc4'] },
  { upTo: 17,       name: 'Amethyst', rim: ['#d6a2ff', '#6b2bb8'] },
  { upTo: 20,       name: 'Ruby',     rim: ['#ff8c9e', '#b0122f'] },
  { upTo: 24,       name: 'Diamond',  rim: ['#ffffff', '#7fe3ff'] },
  { upTo: Infinity, name: 'Rainbow',  rim: null },
];

export function rarityIndex(tier) { return RARITIES.findIndex(r => tier <= r.upTo); }
