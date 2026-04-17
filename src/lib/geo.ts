/**
 * Geolocation utilities
 * Pure TypeScript – no external dependencies.
 * Works for all coordinates on Earth.
 */

const EARTH_RADIUS_MILES = 3958.8;
const EARTH_RADIUS_KM = 6371.0;

/**
 * Haversine distance formula.
 * Returns distance between two lat/lng points in miles.
 */
export function haversineDistanceMiles(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Haversine distance in kilometers.
 */
export function haversineDistanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeocodedLocation {
    displayName: string;
    lat: number;
    lng: number;
}

/**
 * Geocode a free-text address / ZIP code / city using OpenStreetMap Nominatim.
 * Free, no API key, global coverage.
 * IMPORTANT: must be called client-side (browser) or a server route.
 */
export async function geocodeAddress(query: string): Promise<GeocodedLocation | null> {
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'PKDCompass/1.0 (pkdcompass.health)',
                'Accept-Language': 'en',
            },
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data || data.length === 0) return null;
        const first = data[0];
        return {
            displayName: first.display_name,
            lat: parseFloat(first.lat),
            lng: parseFloat(first.lon),
        };
    } catch {
        return null;
    }
}
