// src/services/cacheService.ts

import { redisConnection } from '@/utils/redisConnection';

export class CacheService {
    private static DEFAULT_TTL = 3600; // 1 hour in seconds

    /**
     * Get data from cache
     * @param key Cache key
     * @returns Cached data or null if not found
     */
    static async get<T>(key: string): Promise<T | null> {
        try {
            const data = await redisConnection.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`❌ Error getting cache for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Set data in cache
     * @param key Cache key
     * @param value Data to cache
     * @param ttl Time to live in seconds (optional)
     */
    static async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
        try {
            const serializedValue = JSON.stringify(value);
            await redisConnection.setex(key, ttl, serializedValue);
        } catch (error) {
            console.error(`❌ Error setting cache for key ${key}:`, error);
        }
    }

    /**
     * Delete data from cache
     * @param key Cache key
     */
    static async delete(key: string): Promise<void> {
        try {
            await redisConnection.del(key);
        } catch (error) {
            console.error(`❌ Error deleting cache for key ${key}:`, error);
        }
    }

    /**
     * Get or set cache
     * @param key Cache key
     * @param fetchData Function to fetch data if not in cache
     * @param ttl Time to live in seconds (optional)
     */
    static async getOrSet<T>(
        key: string,
        fetchData: () => Promise<T>,
        ttl: number = this.DEFAULT_TTL
    ): Promise<T | null> {
        try {
            const cachedData = await this.get<T>(key);
            if (cachedData) {
                return cachedData;
            }

            const freshData = await fetchData();
            await this.set(key, freshData, ttl);
            return freshData;
        } catch (error) {
            console.error(`❌ Error in getOrSet for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Clear cache by pattern
     * @param pattern Pattern to match keys (e.g., "user:*")
     */
    static async clearByPattern(pattern: string): Promise<void> {
        try {
            const keys = await redisConnection.keys(pattern);
            if (keys.length > 0) {
                await redisConnection.del(...keys);
            }
        } catch (error) {
            console.error(`❌ Error clearing cache for pattern ${pattern}:`, error);
        }
    }
}
