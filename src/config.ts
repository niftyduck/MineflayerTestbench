import { z } from 'zod';
import fs from 'fs';

/**
 * Runtime-tunable parameters for the testbench. Every value has a default equal
 * to the value that used to be hardcoded in the source, so an absent or partial
 * config file behaves exactly as before.
 *
 * The config is loaded once (from `./config.json` by default, or the path given
 * via the `config=` command-line argument) and shared through {@link getConfig}.
 */
const ConfigSchema = z.object({
    /** HTTP API server (used in server mode). */
    server: z.object({
        /** Port the HTTP API listens on. */
        port: z.number().int().default(3000),
    }).prefault({}),

    /** How much of the world `GET /status` reports around the bot. */
    scan: z.object({
        /** Horizontal (x/z) block scan radius around the bot. */
        radiusHorizontal: z.number().int().default(3),
        /** How many blocks above the bot to scan. */
        heightAboveBot: z.number().int().default(2),
        /** How many blocks below the bot to scan. */
        heightBelowBot: z.number().int().default(1),
        /** Radius (blocks) within which entities are reported. */
        entityRadius: z.number().default(10),
    }).prefault({}),

    /** Timeouts / ranges used while executing bot actions. */
    actions: z.object({
        /** Max time (ms) to wait for the pathfinder to reach a goal. */
        pathfindTimeoutMs: z.number().int().default(10000),
        /** Max distance (blocks) at which loot can be picked up. */
        maxPickupRange: z.number().default(5),
        /** How close (blocks) the bot gets to an item while picking it up. */
        itemPickupRadius: z.number().default(0.5),
        /** Max time (ms) to wait while picking up an item. */
        itemPickupTimeoutMs: z.number().int().default(2000),
        /** Generic short timeout (ms) for command-response checks. */
        shortTimeoutMs: z.number().int().default(500),
    }).prefault({}),

    /** Parameters for building levels from CSV. */
    levelBuilder: z.object({
        /** Delay (ms) before placing a `!`-deferred block. */
        deferredPlacementDelayMs: z.number().int().default(100),
        /** Game ticks to wait after a level is built. */
        postBuildWaitTicks: z.number().int().default(20),
    }).prefault({}),

    /** General bot behaviour. */
    bot: z.object({
        /** Game ticks to wait after spawning before the bot acts. */
        spawnSettleTicks: z.number().int().default(10),
    }).prefault({}),
}).prefault({});

export type Config = z.infer<typeof ConfigSchema>;

/** The fully-defaulted configuration (i.e. what you get with no config file). */
export const DEFAULT_CONFIG: Config = ConfigSchema.parse({});

let cached: Config | null = null;

/**
 * Load configuration from a JSON file, filling in defaults for anything absent.
 * A missing file is fine (defaults are used). The result is cached and returned
 * by subsequent {@link getConfig} calls.
 */
export function loadConfig(path: string = './config.json'): Config {
    let raw: unknown = {};
    try {
        if (fs.existsSync(path)) {
            raw = JSON.parse(fs.readFileSync(path, 'utf8'));
            console.log(`Loaded configuration from ${path}`);
        } else {
            console.log(`No config file at ${path}; using default configuration`);
        }
    } catch (e) {
        console.warn(`Could not read config file ${path}, using defaults: ${e}`);
    }
    cached = ConfigSchema.parse(raw);
    return cached;
}

/**
 * The active configuration. If {@link loadConfig} has not been called yet, this
 * lazily loads defaults so modules can be used/tested without an explicit load.
 */
export function getConfig(): Config {
    if (!cached) {
        cached = ConfigSchema.parse({});
    }
    return cached;
}
