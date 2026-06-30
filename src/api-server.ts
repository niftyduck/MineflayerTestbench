import express from "express";
import cors from "cors";
import type { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { buildLevel } from "./level-builder.js";
import { DiscriminizedAction } from "./tests-schema.js";
import { UUID } from "node:crypto";
import { boolean } from "zod";

/**
 * Constants used in the API server
 */

/** Horizontal scan radius (blocks) around the bot */
const SCAN_RADIUS_HORIZONTAL = 3;
/** Vertical scan height above the bot */
const SCAN_HEIGHT_ABOVE_BOT = 2;
/** Vertical scan height below the bot */
const SCAN_HEIGHT_BELOW_BOT = 1;
/** Scan radius (blocks) for entities around the bot */
const SCAN_ENTITY_RADIUS = 10;

let botStatus: string = 'IDLE';
let bot: Bot | null = null;
let map: Record<string, Vec3 | UUID> | null = null;
let lastActionResult: boolean = true;

/**
 * Starts the API server for the Minecraft bot
 * @param minecraftBot The Mineflayer bot instance
 * @param port The port on which to start the server
 */
export function startApiServer(minecraftBot: Bot, port: number  = 3000): void   {
    bot = minecraftBot;

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Endpoint to get the bot's status
    app.get('/status', (req, res) => {
        if (!bot) {
            return res.status(500).json({ error: 'Bot is not initialized' });
        }
        const pos = bot.entity.position;
        const inventory = bot.inventory.items().map(item => ({
            id: item.type,
            count: item.count,
            slot: item.slot,
            name: item.name,
        }));
        const nearbyBlocks = scanNearbyBlocks(bot);
        const nearbyEntities = scanNearbyEntities(bot);

        res.json({
            status: botStatus,
            lastActionResult: lastActionResult,
            position: { x: pos.x, y: pos.y, z: pos.z },
            health: bot.health,
            food: bot.food,
            inventory,
            nearbyBlocks,
            nearbyEntities,
        });
    });

    // Endpoint to build a level based on the provided csv level description
    app.post('/build-level', async (req, res) => {
        if (!bot) {
            return res.status(500).json({ error: 'Bot is not initialized' });
        }
        const { level_csv, x, y, z } = req.body;
        if (!level_csv || x === undefined || y === undefined || z === undefined) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        botStatus = 'BUSY';
        try {
            const location = new Vec3(x, y, z);
            map = await buildLevel(bot, level_csv, location);
            const tags : Record<string, any> = {};
            for (const [key, value] of Object.entries(map)) {
                if (value instanceof Vec3) {
                    tags[key] = { x: value.x, y: value.y, z: value.z };
                } else {
                    tags[key] = {uuid: value};
                }
            }
            res.json({success: true, tags});
        } catch (err : any) {
            botStatus = 'IDLE';
            res.status(500).json({ error: 'Failed to build level' });
        } finally {
            botStatus = 'IDLE';
        }
    });

    app.post('/action', async (req, res) => {
        if (!bot) {
            return res.status(500).json({ error: 'Bot is not initialized' });
        }

        if (!req.body) {
            return res.status(400).json({ error: 'Missing action json' });
        }

        try {
            const action = DiscriminizedAction.parse(req.body);
            startAsyncAction(bot, action, res);
        } catch (e){
            return res.status(400).json({ error: e });  
        }
        
    });

    app.listen(port, () => {
        console.log(`Minecraft API server is running on http://localhost:${port}`);
    });
}


/**
 * Starts an asynchronous action and manages the bot's status
 * @param botInstance: the Bot instance
 * @param action The Zod action json object
 * @param response The Express response object
 * @returns 
 */
function startAsyncAction(botInstance: Bot, action: DiscriminizedAction, response: express.Response): void {
    if (botStatus !== 'IDLE') {
        response.status(400).json({ status: 'accepted', note: 'bot already busy' });
        return;
    }

    botStatus = action.name;
    action.execute(botInstance, map)
    .then((res: boolean | void) => { 
        botStatus = 'IDLE';
        lastActionResult = action.expect_result === undefined || action.expect_result === res;
        })
    .catch(() => { 
        botStatus = 'IDLE'; 
        lastActionResult = false;
    });
    response.status(200).json({ status: 'accepted', note: 'action started' });
}


/**
 * Scans for blocks near the bot
 * @param botInstance The Mineflayer bot instance
 * @returns An array of nearby blocks
 */
function scanNearbyBlocks(botInstance: Bot): Array<{ id: string; position: { x: number; y: number; z: number } }> {
    const pos = botInstance.entity.position;
    const cx = Math.floor(pos.x);
    const cy = Math.floor(pos.y);
    const cz = Math.floor(pos.z);

    const nearbyBlocks: Array<{ id: string; position: { x: number; y: number; z: number } }> = [];

    for (let x = cx - SCAN_RADIUS_HORIZONTAL; x <= cx + SCAN_RADIUS_HORIZONTAL; x++) {
        for (let y = cy - SCAN_HEIGHT_BELOW_BOT; y <= cy + SCAN_HEIGHT_ABOVE_BOT; y++) {
            for (let z = cz - SCAN_RADIUS_HORIZONTAL; z <= cz + SCAN_RADIUS_HORIZONTAL; z++) {
                const block = botInstance.blockAt(new Vec3(x, y, z));
                if (block && block.type !== 0) { // Exclude air blocks
                    nearbyBlocks.push({
                        id: block.name,
                        position: { x, y, z },
                    });
                }
            }
        }
    }  

    return nearbyBlocks;    
}


/**
 * Scans for entities near the bot
 * @param botInstance The Mineflayer bot instance
 * @returns An array of nearby entities
 */
function scanNearbyEntities(botInstance: Bot): Array<{ name: string; position: { x: number; y: number; z: number } }> {
    const pos = botInstance.entity.position;
    return Object.values(botInstance.entities)
        .filter(e => {
            const dx = e.position.x - pos.x;
            const dy = e.position.y - pos.y;
            const dz = e.position.z - pos.z;
            return Math.sqrt(dx * dx + dy * dy + dz * dz) <= SCAN_ENTITY_RADIUS;
        })
        .map(e => ({
            name: e.name || e.entityType?.toString() || 'unknown',
            position: { x: e.position.x, y: e.position.y, z: e.position.z },
        }));
}