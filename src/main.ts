import mineflayer from 'mineflayer';
//import { pathfinder, Movements, goals } from 'mineflayer-pathfinder';
//const { GoalNear } = goals;
import {isOp, waitForOp} from './op-check.js'
import { buildLevel } from './level-builder.js';
import { Vec3 } from 'vec3';


const bot = mineflayer.createBot({
    host: 'localhost', // minecraft server ip
    username: 'Bot', // username to join as if auth is `offline`, else a unique identifier for this account. Switch if you want to change accounts
    auth: 'offline' // for offline mode servers, you can set this to 'offline'
});




// Log errors and kick reasons:
bot.on('kicked', console.log);
bot.on('error', console.log);

bot.once('spawn', async () => {
    if (!await isOp(bot)){
        bot.chat('bot is not OP on the server please run the following command:');
        bot.chat(`op ${bot.username}`);
        await waitForOp(bot);
        bot.chat('Bot is successfully op:');
    }
    // this tag will be used later
    bot.chat('/tag @s add bot');
    await bot.waitForTicks(10);
    const map = await buildLevel(bot, "test.csv", new Vec3(100, 64, 0));

    console.log(map)
});

