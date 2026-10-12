// NWS explicitly requires a descriptive User-Agent identifying the calling application, with a way to contact its owner.
const USER_AGENT = '(nws-marine-weather-warning-tracker, https://github.com/timmKal01/nws-marine-weather-warning-tracker)';

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const REQUEST_TIMEOUT_MS = 15_000;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Confirmed live against api.weather.gov/alerts/types: the marine-specific subset of NWS's full event type list. */
const MARINE_EVENTS = [
    'Small Craft Advisory',
    'Gale Watch',
    'Gale Warning',
    'Storm Warning',
    'Hurricane Force Wind Watch',
    'Hurricane Force Wind Warning',
    'Special Marine Warning',
    'Marine Weather Statement',
    'Coastal Flood Advisory',
    'Coastal Flood Watch',
    'Coastal Flood Warning',
    'Coastal Flood Statement',
    'High Surf Advisory',
    'High Surf Warning',
    'Rip Current Statement',
];

/** api.weather.gov has no documented SLA and is known to slow down or 5xx under load; retries and a per-attempt timeout keep one bad request from failing (or hanging) the whole run. */
async function fetchJson(url) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        let res;
        try {
            res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' }, signal: controller.signal });
        } catch (err) {
            lastError = err.name === 'AbortError' ? new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`) : err;
            if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
            continue;
        } finally {
            clearTimeout(timeoutId);
        }
        if (res.ok) return res.json();
        if (!TRANSIENT_STATUSES.has(res.status)) {
            throw new Error(`Request failed: ${url} (${res.status})`);
        }
        lastError = new Error(`Request failed: ${url} (${res.status})`);
        if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1));
    }
    throw lastError;
}

/** Full state and territory names people type instead of the two-letter code NWS expects. */
const AREA_NAMES = {
    alabama: 'AL', alaska: 'AK', 'american samoa': 'AS', california: 'CA', connecticut: 'CT', delaware: 'DE',
    'district of columbia': 'DC', florida: 'FL', georgia: 'GA', guam: 'GU', hawaii: 'HI', illinois: 'IL',
    indiana: 'IN', louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI',
    minnesota: 'MN', mississippi: 'MS', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new york': 'NY',
    'north carolina': 'NC', 'northern mariana islands': 'MP', ohio: 'OH', oregon: 'OR', pennsylvania: 'PA',
    'puerto rico': 'PR', 'rhode island': 'RI', 'south carolina': 'SC', texas: 'TX', 'virgin islands': 'VI',
    'us virgin islands': 'VI', virginia: 'VA', washington: 'WA', wisconsin: 'WI',
};

/**
 * Offshore alerts (Small Craft Advisory, Gale, Storm, Special Marine Warning...) are issued for NWS
 * marine zones, which sit under ocean-region codes, not under any state. A plain state filter found
 * none of them (checked 2026-10-12: "AK" returned 0 Small Craft Advisories while 71 were active in PK).
 * So each state also pulls in the region(s) off its coast. A region covers several states' waters.
 */
const MARINE_REGIONS = ['AM', 'AN', 'GM', 'LC', 'LE', 'LH', 'LM', 'LO', 'LS', 'PH', 'PK', 'PM', 'PS', 'PZ', 'SL'];
const STATE_REGIONS = {
    WA: ['PZ'], OR: ['PZ'], CA: ['PZ'], AK: ['PK'], HI: ['PH'], AS: ['PS'], GU: ['PM'], MP: ['PM'],
    TX: ['GM'], LA: ['GM'], MS: ['GM'], AL: ['GM'], FL: ['GM', 'AM'], GA: ['AM'], SC: ['AM'], NC: ['AM', 'AN'],
    PR: ['AM'], VI: ['AM'], VA: ['AN'], MD: ['AN'], DE: ['AN'], DC: ['AN'], NJ: ['AN'], CT: ['AN'], RI: ['AN'],
    MA: ['AN'], NH: ['AN'], ME: ['AN'], NY: ['AN', 'LE', 'LO', 'SL'], PA: ['LE'], OH: ['LE'],
    MI: ['LS', 'LM', 'LH', 'LE', 'LC'], WI: ['LS', 'LM'], MN: ['LS'], IL: ['LM'], IN: ['LM'],
};
const VALID_AREAS = new Set([...Object.values(AREA_NAMES), ...MARINE_REGIONS]);

const singular = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ')
    .replace(/ies$/, 'y').replace(/(watch)es$/, '$1').replace(/s$/, '');

/**
 * Turns the input into the exact values NWS expects, and lists anything it couldn't understand.
 * Alert types match case-insensitively, singular or plural. Before 2026-10-12 an alert type that
 * wasn't spelled exactly like the list was dropped, and if none matched, the event filter vanished
 * and every active NWS alert came back as a "marine alert". A full state name made NWS answer 400.
 */
export function normalizeInput({ areas = [], eventTypes = [] } = {}) {
    const problems = [];

    const events = [];
    for (const raw of eventTypes ?? []) {
        const key = singular(String(raw));
        if (!key) continue;
        const event = MARINE_EVENTS.find((e) => singular(e) === key);
        if (event) {
            if (!events.includes(event)) events.push(event);
        } else {
            problems.push(`Alert type "${raw}" isn't one of the marine alert types listed in the input form.`);
        }
    }

    const codes = [];
    for (const raw of areas ?? []) {
        const text = String(raw).trim();
        if (!text) continue;
        const code = VALID_AREAS.has(text.toUpperCase()) ? text.toUpperCase() : AREA_NAMES[text.toLowerCase()];
        if (code) {
            for (const c of [code, ...(STATE_REGIONS[code] ?? [])]) if (!codes.includes(c)) codes.push(c);
        } else {
            problems.push(`Area "${raw}" isn't a US coastal state or territory. Use a two-letter code like "FL" or "CA".`);
        }
    }

    const askedForTypes = (eventTypes ?? []).some((e) => String(e).trim());
    const askedForAreas = (areas ?? []).some((a) => String(a).trim());
    return {
        // Empty means "all marine types", but only when the user didn't ask for anything; a list of only
        // unrecognised types must never widen the search.
        events: events.length > 0 ? events : (askedForTypes ? [] : MARINE_EVENTS),
        areas: codes,
        problems,
        nothingValid: (askedForTypes && events.length === 0) || (askedForAreas && codes.length === 0),
    };
}

/**
 * Several values go in ONE comma-separated parameter. api.weather.gov silently keeps only the last of
 * repeated `event=`/`area=` parameters (checked 2026-10-12): the default check used to cover only Rip
 * Current Statements, missing 145 other active marine alerts, and only the last area entered.
 */
export async function getActiveMarineAlerts({ events, areas }) {
    const url = new URL('https://api.weather.gov/alerts/active');
    url.searchParams.set('event', events.join(','));
    if (areas.length > 0) url.searchParams.set('area', areas.join(','));

    const data = await fetchJson(url);

    // A second guard, so nothing outside the requested marine types can reach the output.
    return (data.features ?? []).filter((f) => events.includes(f.properties?.event)).map((f) => ({
        status: 'active_alert',
        id: f.properties.id ?? null,
        event: f.properties.event ?? null,
        severity: f.properties.severity ?? null,
        certainty: f.properties.certainty ?? null,
        urgency: f.properties.urgency ?? null,
        headline: f.properties.headline ?? null,
        description: f.properties.description ?? null,
        instruction: f.properties.instruction ?? null,
        areaDesc: f.properties.areaDesc ?? null,
        senderName: f.properties.senderName ?? null,
        effective: f.properties.effective ?? null,
        expires: f.properties.expires ?? null,
        nwsUrl: f.properties['@id'] ?? null,
    }));
}

export { MARINE_EVENTS };
