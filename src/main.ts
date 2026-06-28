import mineflayer from 'mineflayer';
import pathfinder from 'mineflayer-pathfinder';
import fs from 'fs'

import { isOp, waitForOp } from './op-check.js'
import { getArgs } from './args-parse.js';
import {executeTests} from './tests-executer.js'

import { setMovements } from './abstraction.js'

import { TestCasesSchema } from './tests-schema.js';
import { exit } from 'process';

// setup command line args and defaults
const args: any = getArgs();

const tests_json: string = args?.test || "./arena.json";
const parsed_tests = TestCasesSchema.parse(JSON.parse(fs.readFileSync(tests_json, 'utf8')));
const meta = parsed_tests.meta;
const output_csv_path: string | undefined = args?.output_csv || meta.output_csv

const rawAddress: string = args?.address || meta.address || "127.0.0.1";
const [host, portStr] = rawAddress.split(":");
const port = portStr ? parseInt(portStr, 10) : 25565;

const bot = mineflayer.createBot({
    host,
    port,
    username: args?.username || meta.username,
    auth: 'offline' // for offline mode servers, no need to buy real accounts for testing
});

// Inject the pathfinder plugin
bot.loadPlugin(pathfinder.pathfinder);

// Log errors and kick reasons:
bot.on('kicked', (m) => {console.log(m), exit(3)});
bot.on('error', (m) => {console.log(m), exit(4)});

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
    setMovements(bot);

    console.log(`MineflayerTestbed running on ${bot.version} server`)

    const success: boolean = await executeTests(bot, parsed_tests, output_csv_path);
    
    bot.quit();
    exit(success? 0 : 1); //convert boolean to standard bash 0 for all correct 1 for error
});

