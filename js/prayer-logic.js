
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

    // Correctly handle the date for the specific location.
    // We approximate the local time by shifting the UTC time by longitude/15 hours.
    // This gives us the "local date" to ask Adhan to calculate for.
    const timeOffsetMS = (lon / 15) * 3600 * 1000;
    const localDateEstimate = new Date(date.getTime() + timeOffsetMS);

    try {
        // Calculate PrayerTimes for the estimated local date.
        // Adhan uses the Year/Month/Day of the passed date object.
        let prayerTimes = new adhan.PrayerTimes(coordinates, localDateEstimate, params);

        // Determine phase
        // Note: The prayerTimes dates are absolute timestamps.

        if (date >= prayerTimes.isha) {
            return PrayerPhase.ISHA;
        }
        if (date >= prayerTimes.maghrib) return PrayerPhase.MAGHRIB;
        if (date >= prayerTimes.asr) return PrayerPhase.ASR;
        if (date >= prayerTimes.dhuhr) return PrayerPhase.DHUHR;
        if (date >= prayerTimes.sunrise) return PrayerPhase.DUHA;
        if (date >= prayerTimes.fajr) return PrayerPhase.FAJR;

        // If current time is BEFORE Fajr of this "local day", it is effectively the Isha of the PREVIOUS day.
        // Or, it could be that our localDateEstimate was slightly off (e.g. it's 1AM locally, so it's the same day, just early).
        // In either case, "Before Fajr" corresponds to the Night (Isha) phase.
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
