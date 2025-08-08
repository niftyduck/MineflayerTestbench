import mineflayer from 'mineflayer';
//import { pathfinder, Movements, goals } from 'mineflayer-pathfinder';
//const { GoalNear } = goals;

import { buildLevel } from './level-builder.js';
import { Vec3 } from 'vec3';


const bot = mineflayer.createBot({
    host: 'localhost', // minecraft server ip
    username: 'Bot', // username to join as if auth is `offline`, else a unique identifier for this account. Switch if you want to change accounts
    auth: 'offline' // for offline mode servers, you can set this to 'offline'
});


bot.once('spawn', async () => {
    let res = await buildLevel(bot, "test.csv", new Vec3(100, 64, 0));
    
    console.log(res);
});

// Log errors and kick reasons:
bot.on('kicked', console.log);
bot.on('error', console.log);