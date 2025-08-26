import fs from 'fs'

import type { Bot } from 'mineflayer';

import { attack, breakBlock, click, moveTo, selectItem, pickUpLoot, placeBlockOn, useOnEntity, checkBlock, checkEntity, jump, checkInventory, sneak } from './abstraction.js'
import v from 'vec3';


export async function executeTests(bot: Bot, map: any, tests_json: string): Promise<boolean> {
    const test: any = JSON.parse(fs.readFileSync(tests_json, 'utf8'));

    for (const action of test?.actions) {
        let res: boolean | null = null;
        const action_name = action?.name;
        const verbose = action?.verbose;

        const startTime = performance.now()
        console.log(action_name);
        switch (action_name) {
            case "move_to":
                res = await moveTo(bot, map[action.target], action?.distance, verbose);
                break

            case "break":
                res = await breakBlock(bot, map[action.target], verbose);
                break

            case "attack":
                await attack(bot, map[action.target]);
                break

            case "place_block_on":
                res = await placeBlockOn(bot, map[action.target], action?.face, verbose);
                break;

            case "use_on_entity":
                await useOnEntity(bot, map[action.target]);
                break;

            case "pick_up_loot":
                res = await pickUpLoot(bot, verbose);
                break;

            case "jump":
                await jump(bot);
                break;

            case "sneak":
                sneak(bot, action?.sneak_state);
                break;

            case "select_item":
                if (action.slot && typeof action.slot == "number") {
                    await selectItem(bot, action.slot);
                } else {
                    res = await selectItem(bot, action.item_id, verbose);
                }
                break;

            case "click":
                await click(bot, map[action.target], action?.face);
                break;

            case "chat":
                bot.chat(action.message);
                break;

            case "wait":
                await bot.waitForTicks(action.ticks);
                break;

            case "check_block":
                res = await checkBlock(bot, map[action.target].position, action?.expected, action?.nbt, verbose);
                break;

            case "check_entity":
                res = await checkEntity(bot, map[action.target], action?.expected);
                break;

            case "check_inventory":
                res = checkInventory(bot, action.item_id, action?.count, action?.custom_namee, action?.durability, verbose);
                break

            default:
                throw new Error(`Invalid action: ${action_name}`);
        }


        if (verbose) {
            console.log(action);
            if (res !== null) {
                console.log(res ? "  Succeded!" : "  Failed!");
            }
            console.log(`  took ${performance.now() - startTime} ms`);
        }

        // check the result matches the expected one
        if (res !== null) {
            const expect_result = action?.expect_result;
            if (expect_result !== undefined && res !== expect_result) {
                throw new Error(`Action ${JSON.stringify(action)} resulted ${res}`);
            }
        }

        await bot.waitForTicks(1);
    }

    console.log("\nAll test passed successfully");
    bot.chat("All test passed successfully");

    await bot.waitForTicks(20);
    bot.quit();
    return true;
}
