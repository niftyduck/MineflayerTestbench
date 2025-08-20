import type { Bot } from 'mineflayer';

import type { Block } from 'prismarine-block';
import type { Entity } from 'prismarine-entity';
import type { Item } from 'prismarine-item';

import pathfinder, { Movements, Pathfinder } from 'mineflayer-pathfinder';

import { Vec3 } from 'vec3';

const TIMEOUT_PATHFIND = 10000;
const MAX_PICKUP_RANGE = 5;
const ITEM_PICKUP_RADIUS = .5;
const ITEM_PICKUP_TIMEOUT = 2000;
let movement: Movements;

// because instanceof doesn't work...
function isBlock(target: any): target is Block {
    return target.constructor.name == "Block";
}

function isEntity(target: any): target is Entity {
    return target.constructor.name == "Entity";
}




export function setMovements(bot: Bot) {

    const defaultMove: pathfinder.Movements = new pathfinder.Movements(bot);

    // can't break or place blocks while pathfinding
    defaultMove.canDig = false;
    defaultMove.scafoldingBlocks = [];

    movement = defaultMove;
}

export async function moveTo(bot: Bot, target: Block | Entity | Vec3): Promise<boolean> {
    let coords: Vec3 = target instanceof Vec3 ? target : target.position;
    await bot.waitForTicks(1);

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
            resolve(false);
        }, TIMEOUT_PATHFIND);

        bot.once("goal_reached", () => {
            cleanup();
            resolve(true);
        })

        bot.on("path_update", (status) => {
            if (status.status === "noPath" || status.status === "timeout") {
                cleanup();
                resolve(false);
                return;
            }
        })
        const goal = new pathfinder.goals.GoalNear(coords.x, coords.y, coords.z, 1);
        bot.pathfinder.setMovements(movement);
        bot.pathfinder.setGoal(goal);
    })
}


export async function breakBlock(bot: Bot, block: Block | Vec3): Promise<boolean> {
    const to_dig: Block | null = isBlock(block) ? block : bot.blockAt(block);

    if (!to_dig || to_dig.type == 0) {
        return false;
    }

    await bot.dig(to_dig);

    // if the block is differnt than the one we started with we broke it successfully
    return to_dig.type != bot.blockAt(to_dig.position)?.type;
}

export async function click(bot: Bot, target: Block | Entity | Vec3) {
    if (isEntity(target)) {
        return await bot.activateEntity(target);
    }

    let block: Block | null = isBlock(target) ? target : bot.blockAt(target);
    if (block) {
        return await bot.activateBlock(block);
    }
}

export async function pickUpLoot(bot: Bot): Promise<boolean> {
    await bot.waitForTicks(1);
    const item_entity = bot.nearestEntity((e) => e.name === "item");

    if (!item_entity || !item_entity.isValid || bot.entity.position.distanceTo(item_entity.position) > MAX_PICKUP_RANGE)
        return false;

    return new Promise<boolean>(resolve => {
        const timeout = setTimeout(async () => {
            bot.removeAllListeners("entityGone");
            await bot.pathfinder.stop();
            resolve(false);
        }, ITEM_PICKUP_TIMEOUT);

        bot.on('entityGone', async (entity) => {
            if (entity === item_entity) {
                clearTimeout(timeout);
                await bot.pathfinder.stop();
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

export async function selectItem(bot: Bot, element: number | string): Promise<boolean> {
    if (typeof element === "number") {
        await bot.setQuickBarSlot(element + 1);
        return true;
    }

    const item: Item = bot.inventory.items().filter(item => item.name === element)?.[0];
    if (!item) {
        return false;
    }

    await bot.equip(item, "hand");

    return bot.entity.heldItem === item;
}


export async function wait(bot: Bot, ticks: number) {
    await bot.waitForTicks(ticks);
}