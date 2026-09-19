# Marine Weather Warning Tracker: NWS Alerts by Area

Check for active marine hazard alerts from the official NOAA/National
Weather Service feed: Small Craft Advisory, Gale Warning, Storm Warning,
Coastal Flood, High Surf, Rip Current, and more, filtered by US coastal
state.

## Who this is for

- **Boating and marine recreation operators** checking active hazard alerts before heading out.
- **Ports and shipping operations** monitoring coastal conditions across multiple areas at once.
- **Marine insurance underwriters** tracking active marine hazard warnings by region.

## Input

| Field | Type | Description |
|---|---|---|
| `areas` | array | Two-letter US coastal state/territory codes, e.g. `["FL", "CA", "HI"]`. Leave empty for all coastal areas nationwide. |
| `eventTypes` | array | Limit to specific alert types (see list below). Leave empty for all of them. |

```json
{
  "areas": ["FL"]
}
```

Alert types supported: Small Craft Advisory, Gale Watch, Gale Warning,
Storm Warning, Hurricane Force Wind Watch, Hurricane Force Wind Warning,
Special Marine Warning, Marine Weather Statement, Coastal Flood Advisory,
Coastal Flood Watch, Coastal Flood Warning, Coastal Flood Statement, High
Surf Advisory, High Surf Warning, Rip Current Statement.

## Output

One record per active alert:

```json
{
  "id": "https://api.weather.gov/alerts/urn:oid:2.49.0.1.840...",
  "event": "Small Craft Advisory",
  "severity": "Moderate",
  "certainty": "Likely",
  "urgency": "Expected",
  "headline": "Small Craft Advisory issued...",
  "description": "...",
  "instruction": "...",
  "areaDesc": "Coastal waters from...",
  "senderName": "NWS Miami FL",
  "effective": "2026-09-19T06:00:00-04:00",
  "expires": "2026-09-19T18:00:00-04:00",
  "nwsUrl": "https://api.weather.gov/alerts/urn:oid:..."
}
```

An empty result means no active marine alerts match your filters right now.

## How it works

Direct calls to `api.weather.gov`, official NOAA/National Weather Service
alerts feed, US federal government data. No proxy, no scraping.

## Related products

- [Tsunami Warning Tracker](https://github.com/timmKal01/noaa-tsunami-warning-tracker) — same alert family, scoped to tsunami-specific events instead of everyday marine hazards
- [US Weather Forecast & Alerts Tracker](https://github.com/timmKal01/us-weather-tracker) — general forecast and alerts for any US location, not scoped to marine hazards
- [Active Hurricane & Tropical Storm Tracker](https://github.com/timmKal01/active-hurricane-tracker) — named tropical cyclones specifically, from the National Hurricane Center
