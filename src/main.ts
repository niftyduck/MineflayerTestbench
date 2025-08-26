import mineflayer from 'mineflayer';
import pathfinder from 'mineflayer-pathfinder';
import { Vec3 } from 'vec3';

import { isOp, waitForOp } from './op-check.js'
import { buildLevel } from './level-builder.js';
import { getArgs } from './args-parse.js';
import {executeTests} from './tests-parser.js'

import { attack, breakBlock, click, moveTo, pickUpLoot, setMovements } from './abstraction.js'

// setup command line args and defaults
const args: any = getArgs();

const coords: number[] = args?.coords?.split(",")?.map((n: string) => parseInt(n, 10));
const location: Vec3 =
    (coords && coords.length == 3) ?
        new Vec3(coords[0], coords[1], coords[2]) :
        // else
        new Vec3(32, 65, 0);

const level_csv: string = args?.level || "test.csv";
const tests_json: string = args?.test || "test.json";

const bot = mineflayer.createBot({
    host: args?.address || 'localhost',
    username: args?.username || 'Bot',
    auth: 'offline' // for offline mode servers, no need to buy real accounts for testing
});

// Inject the pathfinder plugin
bot.loadPlugin(pathfinder.pathfinder);

// Log errors and kick reasons:
bot.on('kicked', console.log);
bot.on('error', console.log);

bot.once('spawn', async () => {
    if (!await isOp(bot)) {
        bot.chat('bot is not OP on the server please run the following command:');
        bot.chat(`op ${bot.username}`);
        await waitForOp(bot);
        bot.chat('Bot is successfully op:');
    }
    // this tag will be used later
    bot.chat('/tag @s add bot');
    await bot.waitForTicks(10);
    const map = await buildLevel(bot, level_csv, location);
    
    // console.log(bot.inventory.items());
    
    setMovements(bot);

    await executeTests(bot, map, tests_json);

    // console.log(map);
    /* 
    await click(bot, map["btn"]);
    await moveTo(bot, map["chest"]);

    await breakBlock(bot, map["chest"]);
    await pickUpLoot(bot);
    await moveTo(bot, map["frank"]);
    await attack(bot, map["frank"]);
    */

});

