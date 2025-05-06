// src/config/dbPool.ts

import { PrismaClient } from '@prisma/client';

class DatabasePool {
    private static instance: DatabasePool;
    private prisma: PrismaClient;
    private poolSize: number;
    private activeConnections: number;
    private maxConnections: number;

    private constructor() {
        this.poolSize = parseInt(process.env.DB_POOL_SIZE || '10');
        this.maxConnections = parseInt(process.env.DB_MAX_CONNECTIONS || '50');
        this.activeConnections = 0;

        this.prisma = new PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
            // Configure connection pool
            log: ['query', 'info', 'warn', 'error'],
        });

        // Add middleware to track connections
        this.prisma.$use(async (params, next) => {
            this.activeConnections++;
            try {
                const result = await next(params);
                return result;
            } finally {
                this.activeConnections--;
            }
        });

        // Handle connection events
        this.prisma.$on('query', () => {
            if (this.activeConnections > this.poolSize) {
                console.warn(`⚠️ Active connections (${this.activeConnections}) exceed pool size (${this.poolSize})`);
            }
            if (this.activeConnections > this.maxConnections) {
                console.error(`❌ Active connections (${this.activeConnections}) exceed maximum limit (${this.maxConnections})`);
            }
        });
    }

    public static getInstance(): DatabasePool {
        if (!DatabasePool.instance) {
            DatabasePool.instance = new DatabasePool();
        }
        return DatabasePool.instance;
    }

    public getPrisma(): PrismaClient {
        return this.prisma;
    }

    public async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }

    public getActiveConnections(): number {
        return this.activeConnections;
    }

    public getPoolSize(): number {
        return this.poolSize;
    }

    public getMaxConnections(): number {
        return this.maxConnections;
    }
}

// Export a singleton instance
export const dbPool = DatabasePool.getInstance();
export const prisma = dbPool.getPrisma();
