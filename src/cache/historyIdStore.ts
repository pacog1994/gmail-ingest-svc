import * as fs from "fs";



// Define cache file path and expiration time in minutes
const CACHE_FILE_PATH = 'gmail_api_cache.json';
const EXPIRATION_TIME_HOURS = .5; // 30 minutes

function loadCache(): { [key: string]: any } {
    try {
        if (!fs.existsSync(CACHE_FILE_PATH)) {
            fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify({}));
        }

        const cachedData = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8'));
        return cachedData;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // Cache file does not exist yet
            return {};
        }
        throw error;
    }
}

function saveCache(cachedData: { [key: string]: any }) {
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(cachedData));
}

export function setLastMessageIdWithCache(id: string, overwrite = false) {
    const cache = loadCache();
    if (overwrite || !cache.id || (cache.expirationTime < Date.now())) {
        // Set new historyId and update cache
        cache.id = id;
        cache.expirationTime = Date.now() + (EXPIRATION_TIME_HOURS * 60 * 60 * 1000); // hours -> milliseconds
        saveCache(cache);
    }
}

export function getLastMessageIdFromCache(): string | undefined {
    const cache = loadCache();
    console.log("Cache Data\n", cache)
    return cache.id && cache.expirationTime > Date.now() ? cache.id : undefined;
}