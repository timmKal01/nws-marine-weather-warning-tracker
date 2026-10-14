# Marine Weather Warnings: Live NWS Alerts

Active marine weather warnings for U.S. coasts and waters, for ports,
shipping, boating operators and marine insurance. Check a coastal state or
ocean region and get every active marine hazard alert from the official
National Weather Service feed: Small Craft Advisories, Gale and Storm
Warnings, Coastal Flood, High Surf, Rip Currents and more.

## What you get

One row per active alert:

- Alert type, severity, urgency and headline
- The affected coastal zones or waters, and the issuing office
- Start and expiry times
- The official description and safety instructions

When nothing is active for your area, you get one row that says so.

## Who this is for

- **Ports and shipping operations** checking hazards across several coastal areas at once.
- **Boating, charter and marine recreation operators** checking alerts before heading out.
- **Marine insurance underwriters** tracking active hazard warnings by region.

## Input

| Field | Type | Description |
|---|---|---|
| `areas` | array | US coastal states or territories, as two-letter codes (`["FL", "CA", "HI"]`) or names (`"Florida"`), or NWS ocean-region codes (see below). Leave empty for all coastal areas nationwide. |
| `eventTypes` | array | Limit to specific alert types (see list below), in any capitalisation, singular or plural. Leave empty for all of them. |

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

**About areas:** offshore alerts (Small Craft Advisory, Gale, Storm,
Hurricane Force Wind and Special Marine warnings) are issued for marine
zones, which the National Weather Service files under ocean regions rather
than states. So each state also includes the region off its coast, for
example `CA` adds `PZ` (Eastern North Pacific) and `AK` adds `PK`. A region
covers more than one state's waters. You can also enter a region code
directly: `AM`, `AN` (Atlantic), `GM` (Gulf of Mexico), `PZ`, `PK`, `PH`,
`PM`, `PS` (Pacific), `LS`, `LM`, `LH`, `LE`, `LO`, `LC` (Great Lakes), `SL`
(St. Lawrence).

## Output

One record per active alert:

```json
{
  "status": "active_alert",
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
  "nwsUrl": "https://api.weather.gov/alerts/urn:oid:...",
  "checkedAt": "2026-09-19T10:05:00.000Z"
}
```

When nothing matches, the output is one row that says so, instead of an
empty table:

```json
{
  "status": "no_active_alerts",
  "event": null,
  "headline": "No active Small Craft Advisory, Gale Warning for FL, GM, AM",
  "areaDesc": "FL, GM, AM",
  "checkedAt": "2026-10-12T16:40:00.000Z"
}
```

If none of the areas or alert types you entered can be understood, you get
one `"status": "input_error"` row explaining what to fix, and nothing is
charged. You only ever get the marine alert types you asked for.

## How it works

Direct calls to `api.weather.gov`, official NOAA/National Weather Service
alerts feed, US federal government data. No proxy, no scraping.

## Pricing note

Billed per **check**, not per alert returned: one charge whether the
check finds no active marine alerts or several across every requested area.
A run that can't check anything, because none of the areas or alert types
could be understood, isn't charged.

## Related products

- [Tsunami Warning Tracker](https://apify.com/m_ctim/noaa-tsunami-warning-tracker): same alert family, scoped to tsunami-specific events instead of everyday marine hazards
- [US Weather Forecast & Alerts API (NWS)](https://apify.com/m_ctim/us-weather-tracker): general forecast and alerts for any US location, not scoped to marine hazards
- [Active Hurricane Tracker](https://apify.com/m_ctim/active-hurricane-tracker): named tropical cyclones specifically, from the National Hurricane Center
