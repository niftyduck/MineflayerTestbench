import mineflayer from 'mineflayer';
import pathfinder from 'mineflayer-pathfinder';
import fs from 'fs'

import { isOp, waitForOp } from './op-check.js'
import { getArgs } from './args-parse.js';
import {executeTests} from './tests-executer.js'

import { setMovements } from './abstraction.js'

import { startApiServer } from './api-server.js';

import { loadConfig } from './config.js';

import { TestCasesSchema } from './tests-schema.js';
import { exit } from 'process';

// setup command line args and defaults
const args: any = getArgs();

// Load tunable parameters (scan radii, timeouts, api port, ...) from a JSON
// file; missing/partial files fall back to the built-in defaults. Path is
// overridable with `config=<path>` (defaults to ./config.json).
const config = loadConfig(args?.config || "./config.json");

const tests_json: string = args?.test || "./test.json";
const parsed_tests = TestCasesSchema.parse(JSON.parse(fs.readFileSync(tests_json, 'utf8')));
const meta = parsed_tests.meta;
const output_csv_path: string | undefined = args?.output_csv || meta.output_csv

const bot = mineflayer.createBot({
    host: args?.address || meta.address || "127.0.0.1",
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




    await bot.waitForTicks(config.bot.spawnSettleTicks);
    setMovements(bot);

    console.log(`MineflayerTestbed running on ${bot.version} server`)

    // if test is provided, run the tests and exit with the appropriate code
    // else start the API server to allow external control of the bot
    if (args?.test) {
        const success: boolean = await executeTests(bot, parsed_tests, output_csv_path);
        bot.quit();
        exit(success? 0 : 1); //convert boolean to standard bash 0 for all correct 1 for error
    }else{
        startApiServer(bot, config.server.port);
        console.log('API server started. Bot will stay connected until terminated.');
    }

    
});

