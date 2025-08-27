import fs from 'fs'

import type { Bot } from 'mineflayer';

import vec3 from 'vec3';

import { TestCasesSchema } from './tests-schema.js'


export async function executeTests(bot: Bot, map: any, tests_json: string): Promise<boolean> {
   

    const test_cases = TestCasesSchema.parse(JSON.parse(fs.readFileSync(tests_json, 'utf8')))

    for (const test_case of test_cases.test_cases) {

        console.log(`Executing test with id ${test_case.id}`);


        for (const action of test_case.actions) {
            await bot.waitForTicks(1);

            const startTime = performance.now();

            const res = await action.execute(bot, map);

            if (action.verbose) {
                console.log(action);
                if (typeof res === "boolean") {
                    console.log(res ? "  Succeded!" : "  Failed!");
                }
                console.log(`  took ${performance.now() - startTime} ms`);
            }

            if (res !== null) {
                if (action.expect_result !== undefined && res !== action.expect_result) {
                    throw new Error(`Action ${JSON.stringify(action)} resulted ${res}`);
                }
            }
        }
    }

    console.log("\nAll test passed successfully");
    bot.chat("All test passed successfully");

    await bot.waitForTicks(20);
    bot.quit();
    return true;
}
