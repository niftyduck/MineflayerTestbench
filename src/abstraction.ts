import type { Bot } from 'mineflayer';
import { Block } from 'prismarine-block';
import type { Entity } from 'prismarine-entity';
import type { Item } from 'prismarine-item';
import pathfinder, { Movements } from 'mineflayer-pathfinder';

import { Vec3 } from 'vec3';

import { isBlock, isEntity } from './type-check.js';

const TIMEOUT_PATHFIND = 10000;
const MAX_PICKUP_RANGE = 5;
const ITEM_PICKUP_RADIUS = .5;
const ITEM_PICKUP_TIMEOUT = 2000;
const SHORT_TIMEOUT = 500;

let movement: Movements;

export function setMovements(bot: Bot) {
    const defaultMove: Movements = new pathfinder.Movements(bot);

    // can't break or place blocks while pathfinding
    defaultMove.canDig = false;
    defaultMove.scafoldingBlocks = [];

    movement = defaultMove;
}

export async function moveTo(bot: Bot, target: Block | Entity | Vec3, distance: number = 1, verbose?:boolean): Promise<boolean> {
    let coords: Vec3 = target instanceof Vec3 ? target : target.position;

    return new Promise((resolve) => {
        function cleanup() {
            clearTimeout(timeout);
            bot.removeAllListeners("goal_reached");
            bot.removeAllListeners("path_update");

            bot.pathfinder.setGoal(null);
            bot.pathfinder.stop();
        }

        const timeout = setTimeout(() => {
            cleanup();
            if (verbose) console.log("Pathfinder timed out");
            resolve(false);
        }, TIMEOUT_PATHFIND);

        bot.once("goal_reached", () => {
            cleanup();
            resolve(true);
        })

        bot.on("path_update", (status) => {
            if (verbose) console.log(`Path update received: ${status.status}`);
            if (status.status === "noPath" || status.status === "timeout") {
                cleanup();
                resolve(false);
                return;
            }
        })

        const goal = new pathfinder.goals.GoalNear(coords.x, coords.y, coords.z, distance);
        bot.pathfinder.setMovements(movement);
        bot.pathfinder.setGoal(goal);
    })
}


export async function breakBlock(bot: Bot, block: Block | Vec3, verbose?:boolean): Promise<boolean> {
    const to_dig: Block | null = isBlock(block) ? block : bot.blockAt(block);


    if (!to_dig || to_dig.type == 0) {
        return false;
    }

    await bot.dig(to_dig);

    // if the block is differnt than the one we started with we broke it successfully
    let result = bot.blockAt(to_dig.position)

    if (verbose){
        console.log(`Block to dig is ${to_dig}`);
        console.log(`After digging block is ${result}`);
    }
    return to_dig.type != result?.type;
}

export async function click(bot: Bot, target: Block | Entity | Vec3, face?: string) {
    if (isEntity(target)) {
        return await bot.activateEntity(target);
    }

    let block: Block | null = isBlock(target) ? target : bot.blockAt(target);
    if (block) {
        return await bot.activateBlock(block, nameToFace(face));
    }
}

export async function pickUpLoot(bot: Bot, verbose?: boolean): Promise<boolean> {
    await bot.waitForTicks(1);
    const item_entity = bot.nearestEntity((e) => e.name === "item");

    if (!item_entity || !item_entity.isValid || bot.entity.position.distanceTo(item_entity.position) > MAX_PICKUP_RANGE) {
        if (verbose) console.log("no item entity found in range");
        return false;
    }

    return new Promise<boolean>(resolve => {
        const timeout = setTimeout(async () => {
            bot.removeAllListeners("entityGone");
            bot.pathfinder.stop();
            if (verbose) console.log("pathfinder timed out");
            resolve(false);
        }, ITEM_PICKUP_TIMEOUT);

        bot.on('entityGone', async (entity) => {
            if (entity === item_entity) {
                clearTimeout(timeout);
                bot.pathfinder.stop();
                bot.removeAllListeners("entityGone");
                resolve(true);
            }
        });
        const goal = new pathfinder.goals.GoalFollow(item_entity, ITEM_PICKUP_RADIUS);
        bot.pathfinder.setMovements(movement);
        bot.pathfinder.setGoal(goal);
    })
}

export async function attack(bot: Bot, entity: Entity) {
    await bot.attack(entity);
}

export async function useOnEntity(bot: Bot, entity: Entity) {
    await bot.useOn(entity);
}

export async function placeBlockOn(bot: Bot, reference: Block, side: string = "top", verbose?: boolean): Promise<boolean> {
    const face = nameToFace(side) || new Vec3(0, 1, 0);
    const pos = reference.position.plus(face)
    const old_block = bot.blockAt(pos);


    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            bot.removeAllListeners(`blockUpdate:${pos}` as any);
            if (verbose) console.log("Timed out on placeblock");
            resolve(false);
        }, SHORT_TIMEOUT);

        bot.once(`blockUpdate:${pos}` as any, () => {
            clearTimeout(timeout);
            const new_block = bot.blockAt(reference.position.plus(face));

            if (verbose) console.log(`placed a ${new_block?.type} at ${pos}`);
            resolve(old_block?.type !== new_block?.type);
        })

        bot.placeBlock(reference, face);
    })
}

export async function jump(bot: Bot) {
    bot.setControlState("jump", true);
    await bot.waitForTicks(1);
    bot.setControlState("jump", false);
}

export function sneak(bot: Bot, sneak?: boolean) {
    // if not provided just toggle
    sneak = sneak === undefined ? !bot.getControlState("sneak") : sneak;
    bot.setControlState("sneak", sneak);
}

export async function checkBlock(bot: Bot, block: Vec3, expeced_block?: string, nbt?: string, verbose?: boolean): Promise<boolean> {
    if (!expeced_block && !nbt) {
        throw new Error("No checks provided for block");
    }

    const block_id: string = expeced_block || bot.blockAt(block)?.name || "air";

    if (verbose) {
        console.log(`client side block at ${block} is`);
        console.log(bot.blockAt(block));
    }

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve(false);
            bot.removeAllListeners("message");
        }, SHORT_TIMEOUT);

        bot.once("message", (msg) => {
            clearTimeout(timeout);
            if (msg?.translate === "commands.execute.conditional.pass") {
                resolve(true);
            } else {
                resolve(false);
            }
        });
        bot.chat(`/execute if block ${block.x} ${block.y} ${block.z} ${block_id}${nbt || ""}`);
    })

}

export async function checkEntity(bot: Bot, entity: Entity, check: string): Promise<boolean> {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve(false);
            bot.removeAllListeners("message");
        }, SHORT_TIMEOUT);

        bot.once("message", (msg) => {
            clearTimeout(timeout);
            if (msg?.translate === "commands.execute.conditional.pass_count") {
                resolve(true);
            } else {
                resolve(false);
            }
        });

        bot.chat(`/execute as ${entity.uuid} if entity @s[nbt=${check}]`)
    })
}


export function checkInventory(bot: Bot, item_id: string, count?: number, custom_name?: string, durability?: number, verbose?: boolean) {
    const found: number = bot.inventory.items()
        .filter(item => item.name === item_id)
        .filter(item => !custom_name || item.customName === custom_name)
        .filter(item => !durability || item.durabilityUsed === durability)
        .map(item => item.count)
        .reduce((sum, current) => sum + current, 0);

    if (verbose) {
        console.log(`Found ${found} matching items in inventory`);
        console.log(bot.inventory.items());
    }


    if (count) {
        return found === count;
    }
    return found > 0;
}

export async function selectItem(bot: Bot, element: number | string, verbose?: boolean): Promise<boolean> {
    if (typeof element === "number") {
        bot.setQuickBarSlot(element - 1);
        return true;
    }

    if (verbose){
        console.log(bot.inventory.items());
    }

    const item: Item = bot.inventory.items().filter(item => item.name === element)?.[0];
    if (!item) {
        return false;
    }

    await bot.equip(item, "hand");

    return bot.entity.heldItem.name === element;
}


function nameToFace(face: string | undefined): Vec3 | undefined {
    if (!face) {
        return undefined;
    }
    const faceVectors: Record<string, Vec3> = {
        'top': new Vec3(0, 1, 0),
        '+y': new Vec3(0, 1, 0),
        'bottom': new Vec3(0, -1, 0),
        '-y': new Vec3(0, -1, 0),
        'north': new Vec3(0, 0, -1),
        '-z': new Vec3(0, 0, -1),
        'south': new Vec3(0, 0, 1),
        '+z': new Vec3(0, 0, 1),
        'east': new Vec3(1, 0, 0),
        '+x': new Vec3(1, 0, 0),
        'west': new Vec3(-1, 0, 0),
        '-x': new Vec3(-1, 0, 0),
    };

    return faceVectors[face];
}
