import type { Bot } from 'mineflayer';
import { Block } from 'prismarine-block';
import { Entity } from 'prismarine-entity';
import { Vec3 } from 'vec3';
import pathfinder, { goals } from 'mineflayer-pathfinder';


async function moveTo(bot: Bot, target: Block | Entity | Vec3): Promise<boolean> {
    let coords: Vec3 = target instanceof Vec3 ? target : target.position;

    return new Promise((resolve) => {
        bot.once("goal_reached", () => {
            bot.removeAllListeners("goal_reached");
            bot.removeAllListeners("path_update");
            resolve(true);
        })

        bot.on("path_update", (status) => {
            if (status.status === "noPath" || status.status === "timeout") {
                bot.removeAllListeners("goal_reached");
                bot.removeAllListeners("path_update");
                bot.pathfinder.stop();
                resolve(false);
            }
        })

        bot.pathfinder.setGoal(new goals.GoalNear(coords.x, coords.y, coords.z, 1));
    })
}


async function breakBlock(bot:Bot, block: Block | Vec3): Promise<boolean> {
    const to_dig: Block | null = block instanceof Block ? block : bot.blockAt(block);

    if (!to_dig || to_dig.type == 0){
        return false;
    }

    await bot.dig(to_dig);

    // if the block is differnt than the one we started with we broke it successfully
    return to_dig.type != bot.blockAt(to_dig.position)?.type;
}

async function click(bot: Bot, target: Block | Entity | Vec3) {
    if (target instanceof Entity){
        await bot.activateEntity(target);
        return;
    }

    let block: Block | null = target instanceof Block ? target : bot.blockAt(target);
    if (block){
        await bot.activateBlock(block);
    }
}