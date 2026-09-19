import { Actor, log } from 'apify';
import { getActiveMarineAlerts } from './nws.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const { areas = [], eventTypes = [] } = input;

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const MARINE_CHECK_EVENT = 'marine-check';

const alerts = await getActiveMarineAlerts({ areas, eventTypes });

for (const alert of alerts) {
    await Actor.pushData(alert);
}

await Actor.charge({ eventName: MARINE_CHECK_EVENT });

log.info(`Found ${alerts.length} active marine alert(s)`, { areas, eventTypes });

await Actor.exit();
