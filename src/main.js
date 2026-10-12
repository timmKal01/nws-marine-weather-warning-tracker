import { Actor, log } from 'apify';
import { getActiveMarineAlerts, normalizeInput } from './nws.js';

await Actor.init();

const input = (await Actor.getInput()) ?? {};

/** Must match the event name configured in this Actor's pay-per-event pricing on Apify. */
const MARINE_CHECK_EVENT = 'marine-check';

const { events, areas, problems, nothingValid } = normalizeInput(input);
for (const problem of problems) log.warning(problem);

const checkedAt = new Date().toISOString();
const where = areas.length > 0 ? areas.join(', ') : 'all US coasts';

if (nothingValid) {
    // Nothing usable to check: say why in the output, and don't charge for a check that never ran.
    await Actor.pushData({
        status: 'input_error',
        headline: "Couldn't run the check",
        description: problems.join(' '),
        checkedAt,
    });
    log.info('No valid alert types or areas, so nothing was checked and nothing was charged.');
    await Actor.exit();
} else {
    const alerts = await getActiveMarineAlerts({ events, areas });

    for (const alert of alerts) {
        await Actor.pushData({ ...alert, checkedAt });
    }

    // An empty table looks like the tool didn't work, so say plainly that nothing matched.
    if (alerts.length === 0) {
        const what = events.length <= 3 ? events.join(', ') : 'marine alerts';
        await Actor.pushData({
            status: 'no_active_alerts',
            event: null,
            headline: `No active ${what} for ${where}`,
            description: `The National Weather Service had no active ${what} for ${where} when checked at ${checkedAt}.`
                + (problems.length ? ` Note: ${problems.join(' ')}` : ''),
            areaDesc: where,
            checkedAt,
        });
    }

    await Actor.charge({ eventName: MARINE_CHECK_EVENT });

    log.info(`Found ${alerts.length} active marine alert(s)`, { areas, events });

    await Actor.exit();
}
