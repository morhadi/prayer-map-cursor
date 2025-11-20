const adhan = require('./lib/adhan.min.js');

// Mocking the environment since we are in Node but code assumes Browser
// We need to copy the logic from js/prayer-logic.js slightly adapted for Node
// Or just use the logic directly.

const PrayerPhase = {
    ISHA: 0,
    FAJR: 1,
    DUHA: 2,
    DHUHR: 3,
    ASR: 4,
    MAGHRIB: 5
};

function getPrayerPhase(lat, lon, date) {
    const coordinates = new adhan.Coordinates(lat, lon);
    const params = adhan.CalculationMethod.MuslimWorldLeague();
    params.madhab = adhan.Madhab.Shafi;
    params.highLatitudeRule = adhan.HighLatitudeRule.SeventhOfTheNight; // Add this to fix poles?

    const timeOffsetMS = (lon / 15) * 3600 * 1000;
    const localDateEstimate = new Date(date.getTime() + timeOffsetMS);

    try {
        let prayerTimes = new adhan.PrayerTimes(coordinates, localDateEstimate, params);

        // Debug log for specific points
        // console.log(`Lat: ${lat}, Lon: ${lon}, LocalEst: ${localDateEstimate.toISOString()}`);
        // console.log(`Fajr: ${prayerTimes.fajr.toISOString()}`);
        // console.log(`Isha: ${prayerTimes.isha.toISOString()}`);

        if (date >= prayerTimes.isha) return PrayerPhase.ISHA;
        if (date >= prayerTimes.maghrib) return PrayerPhase.MAGHRIB;
        if (date >= prayerTimes.asr) return PrayerPhase.ASR;
        if (date >= prayerTimes.dhuhr) return PrayerPhase.DHUHR;
        if (date >= prayerTimes.sunrise) return PrayerPhase.DUHA;
        if (date >= prayerTimes.fajr) return PrayerPhase.FAJR;

        return PrayerPhase.ISHA; // Before Fajr

    } catch (e) {
        // console.log("Error for", lat, lon, e.message);
        return PrayerPhase.ISHA;
    }
}

// Test Points
const points = [
    { name: "London", lat: 51.5074, lon: -0.1278 },
    { name: "New York", lat: 40.7128, lon: -74.0060 },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
    { name: "Sydney", lat: -33.8688, lon: 151.2093 },
    { name: "Mecca", lat: 21.3891, lon: 39.8579 },
    { name: "San Francisco", lat: 37.7749, lon: -122.4194 }
];

const now = new Date("2023-10-27T12:00:00Z"); // Noon UTC

console.log("Testing at UTC:", now.toISOString());

points.forEach(p => {
    const phase = getPrayerPhase(p.lat, p.lon, now);
    const phaseName = Object.keys(PrayerPhase).find(key => PrayerPhase[key] === phase);
    console.log(`${p.name}: ${phaseName} (${phase})`);
});
