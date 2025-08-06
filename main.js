import mineflayer from 'mineflayer';
//import { pathfinder, Movements, goals } from 'mineflayer-pathfinder';
//const { GoalNear } = goals;

import { getArgs, sleep } from './utils.js';
import { buildLevel } from './level-builder.js';
import { Vec3 } from 'vec3';


const bot = mineflayer.createBot({
    host: 'localhost', // minecraft server ip
    username: 'Bot', // username to join as if auth is `offline`, else a unique identifier for this account. Switch if you want to change accounts
    auth: 'offline' // for offline mode servers, you can set this to 'offline'
})



//bot.loadPlugin(pathfinder);

bot.on('chat', (username, message) => {
    if (username === bot.username) return
    bot.chat("Frick")
})


bot.once('spawn', async () => {
    await sleep(1000);
    let res = await buildLevel(bot, "test.csv", new Vec3(100, 64, 0));
    
    console.log(res);
    /*setTimeout(() => {
        const log = bot.findBlock({ matching: (block) => block.name.includes("_log"), maxDistance: 128 });
        console.log(log); // Should now work
        if (!log) {
            bot.chat("No wood found 3:")
            return
        }
        const log_pos = log.position

        const defaultMove = new Movements(bot)
        bot.pathfinder.setMovements(defaultMove)
        bot.pathfinder.setGoal(new GoalNear(log_pos.x, log_pos.y, log_pos.z, 2))

        bot.once("goal_reached", () => {
            bot.dig(log)
        })
    }, 2000); // Wait 2 seconds for chunks to load
    */
})

// Log errors and kick reasons:
bot.on('kicked', console.log)
bot.on('error', console.log)