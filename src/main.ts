import mineflayer from 'mineflayer';
import pathfinder from 'mineflayer-pathfinder';
import collectBlock from 'mineflayer-collectblock';

import {isOp, waitForOp} from './op-check.js'
import { buildLevel } from './level-builder.js';
import { Vec3 } from 'vec3';
import { getArgs } from './args-parse.js';

import {attack, breakBlock, click, moveTo, pickUpLoot, setMovements, wait} from './abstraction.js'

const args: any = getArgs();

const bot = mineflayer.createBot({
    host: args?.address || 'localhost',
    username: args?.username || 'Bot',
    auth: 'offline' // for offline mode servers, no need to buy real accounts for testing
});

// Inject the pathfinder plugin
bot.loadPlugin(pathfinder.pathfinder);
bot.loadPlugin(collectBlock.plugin);

// Log errors and kick reasons:
bot.on('kicked', console.log);
bot.on('error', console.log);

bot.once('spawn', async () => {

    const defaultMove: pathfinder.Movements = new pathfinder.Movements(bot);

    // can't break or place blocks while pathfinding
    defaultMove.canDig = false;
    defaultMove.scafoldingBlocks = [];
    
    setMovements(defaultMove);

    
    if (!await isOp(bot)){
        bot.chat('bot is not OP on the server please run the following command:');
        bot.chat(`op ${bot.username}`);
        await waitForOp(bot);
        bot.chat('Bot is successfully op:');
    }
    // this tag will be used later
    bot.chat('/tag @s add bot');
    await bot.waitForTicks(10);
    const map = await buildLevel(bot, args["level"] || "test.csv", new Vec3(100, 64, 0));

    // console.log(map);

    await click(bot, map["btn"]);
    await moveTo(bot, map["chest"]);

    await breakBlock(bot, map["chest"]);
    await pickUpLoot(bot);
    await moveTo(bot, map["frank"]);
    await attack(bot, map["frank"]);

});

