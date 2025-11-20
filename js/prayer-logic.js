
const PrayerColors = {
    ISHA: "#2c3e50",
    FAJR: "#e67e22",
    DUHA: "#f1c40f",
    DHUHR: "#3498db",
    ASR: "#9b59b6",
    MAGHRIB: "#e74c3c"
};

const PrayerPhase = {
    ISHA: 0,
    FAJR: 1,
    DUHA: 2,
    DHUHR: 3,
    ASR: 4,
    MAGHRIB: 5
};

// Map methods to Adhan CalculationMethod functions
function getCalculationMethod(methodName) {
    // Adhan.CalculationMethod is an object with functions like MuslimWorldLeague()
    // We need to map the string from the dropdown to these functions
    const map = {
        "MWL": adhan.CalculationMethod.MuslimWorldLeague(),
        "ISNA": adhan.CalculationMethod.NorthAmerica(),
        "Egypt": adhan.CalculationMethod.Egyptian(),
        "Makkah": adhan.CalculationMethod.UmmAlQura(),
        "Karachi": adhan.CalculationMethod.Karachi(),
        "Tehran": adhan.CalculationMethod.Tehran(),
        "Jafari": adhan.CalculationMethod.MoonsightingCommittee() // Approximation or finding closest
    };
    // Fallback or specific handling
    if (methodName === "Jafari") {
        // Jafari/Shia Itna Ashari usually uses specific angles.
        // Adhan.js might not have a direct named preset for Jafari in older versions,
        // but checking the library: adhan.CalculationMethod.Other() allows custom params.
        // For now, let's default to MWL if not found or implement if we see it in the lib.
        // Actually, let's check available methods in adhan object if possible.
        // Safe default:
        return adhan.CalculationMethod.MuslimWorldLeague();
    }
    return map[methodName] || adhan.CalculationMethod.MuslimWorldLeague();
}

function getPrayerPhase(lat, lon, date, calcMethodName, asrMethodName) {
    const coordinates = new adhan.Coordinates(lat, lon);

    // Adhan expects a Date object. It uses the local date components of that object.
    // However, we want to calculate "what is the prayer time NOW at this location".
    // "Now" is the UTC time provided by `date`.

    // Adhan calculates times for the local day.
    // We need to pass the date representing the local time at that coordinate?
    // No, Adhan takes a Date object and uses its Year, Month, Day.
    // If we pass a UTC date, we need to be careful.
    // Actually, Adhan.PrayerTimes(coordinates, date, params) computes the prayer times
    // for the day specified in `date`. The resulting times are Date objects (with timezone info usually matching environment or UTC if set).

    // IMPORTANT: Adhan returns times in the local timezone of the environment (browser),
    // OR it returns Date objects which represent the absolute timestamp.
    // We need to compare `date` (the current slider time) with the computed prayer times.

    const params = getCalculationMethod(calcMethodName);
    // Fix for high latitudes (places where sun doesn't set/rise)
    // SeventhOfTheNight is a common rule for these areas.
    params.highLatitudeRule = adhan.HighLatitudeRule.SeventhOfTheNight;

    if (asrMethodName === "Hanafi") {
        params.madhab = adhan.Madhab.Hanafi;
    } else {
        params.madhab = adhan.Madhab.Shafi;
    }

    // Robust logic: Compare "Local Solar Time" with "Prayer Solar Times".
    // This avoids timezone confusion and IDL issues.

    // 1. Calculate current local time in minutes from midnight (0-1440)
    // UTC Time (mins) + (Lon * 4 min/deg)
    const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
    let localMinutes = utcMinutes + (lon * 4);

    // Normalize to 0-1440 range
    while (localMinutes < 0) localMinutes += 1440;
    while (localMinutes >= 1440) localMinutes -= 1440;

    try {
        // 2. Calculate prayer times for a standard date (we use the current date components)
        // Adhan returns Date objects where the hours/minutes represent the prayer time in the "local" context of the input date.
        // So p.fajr.getHours() gives the solar hour of Fajr.
        const prayerTimes = new adhan.PrayerTimes(coordinates, new Date(), params);

        // Helper to get minutes from midnight for a prayer time
        const getMins = (d) => d.getHours() * 60 + d.getMinutes();

        const isha = getMins(prayerTimes.isha);
        const maghrib = getMins(prayerTimes.maghrib);
        const asr = getMins(prayerTimes.asr);
        const dhuhr = getMins(prayerTimes.dhuhr);
        const sunrise = getMins(prayerTimes.sunrise);
        const fajr = getMins(prayerTimes.fajr);

        // 3. Compare localMinutes with prayer thresholds
        // Handle the night wrapping (Isha can be late, Fajr early)
        // Usually: Fajr < Sunrise < Dhuhr < Asr < Maghrib < Isha

        if (localMinutes >= isha) return PrayerPhase.ISHA;
        if (localMinutes >= maghrib) return PrayerPhase.MAGHRIB;
        if (localMinutes >= asr) return PrayerPhase.ASR;
        if (localMinutes >= dhuhr) return PrayerPhase.DHUHR;
        if (localMinutes >= sunrise) return PrayerPhase.DUHA;
        if (localMinutes >= fajr) return PrayerPhase.FAJR;

        // If localMinutes < Fajr, it's the night (Isha) of the previous day
        return PrayerPhase.ISHA;

    } catch (e) {
        // Handle high latitude errors or invalid coords
        return PrayerPhase.ISHA;
    }
}

window.PrayerLogic = {
    getPrayerPhase,
    PrayerPhase,
    PrayerColors
};
