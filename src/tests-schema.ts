import { z } from 'zod';
import type { Bot } from 'mineflayer';
import type { Vec3 } from 'vec3';

import { attack, breakBlock, click, moveTo, selectItem, pickUpLoot, placeBlockOn, useOnEntity, checkBlock, checkEntity, jump, checkInventory, sneak } from './abstraction.js'

const ActionSchema = z.object({
    name: z.string(),
    expect_result: z.boolean().optional(),
    verbose: z.boolean().optional(),
})


const CheckSchema = ActionSchema.extend({
    expected: z.string(),
    expect_result: z.boolean(),
})

const MoveTo = ActionSchema.extend({
    name: z.literal("move_to"),
    target: z.string(),
    distance: z.number().optional(),
}).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return await moveTo(bot, map[data.target], data.distance, data.verbose);
    }
}))

const PickUpLoot = ActionSchema.extend({
    name: z.literal("pick_up_loot"),
}).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return await pickUpLoot(bot, data.verbose);
    }
}))

const PlaceBlockOn = ActionSchema.extend({
    name: z.literal("place_block_on"),
    target: z.string(),
    face: z.string(),
}).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return await placeBlockOn(bot, map[data.target], data.face, data.verbose);
    }
}))

const Break = ActionSchema.extend({
    name: z.literal("break"),
    target: z.string(),
}).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return await breakBlock(bot, map[data.target], data.verbose);
    }
}))

const Click = ActionSchema.extend({
    name: z.literal("click"),
    target: z.string(),
}).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return await click(bot, map[data.target]);
    }
}))


const SelectItem = ActionSchema.extend({
    name: z.literal("select_item"),
    item_id: z.string(),
}).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return await selectItem(bot, data.item_id, data.verbose);
    }
}))

const Wait = ActionSchema.extend({
    name: z.literal("wait"),
    ticks: z.number().int(),
}).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return await bot.waitForTicks(data.ticks);
    }
}))

const CheckEntity = CheckSchema.extend({
    name: z.literal("check_entity"),
    target: z.string()
}).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return await checkEntity(bot, map[data.target], data.expected);
    }
}))

const Attack = ActionSchema.extend({
    name: z.literal("attack"),
    target: z.string()
}).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return await attack(bot, map[data.target]);
    }
}))


const CheckBlock = CheckSchema.extend({
    name: z.literal("check_block"),
    target: z.string(),
    nbt: z.string().optional()
}).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return await checkBlock(bot, map[data.target], data.expected, data.nbt, data.verbose);
    }
}))

const CheckInventory = CheckSchema.extend({
    name: z.literal("check_inventory"),
    count: z.number().int().optional(),
    durability: z.number().int().optional(),
    custome_name: z.string().optional()
}).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return checkInventory(bot, data.expected, data.count, data.custome_name, data.durability, data.verbose);
    }
}))

const DiscriminizedActions = z.discriminatedUnion("name", [
    Wait,
    SelectItem,
    MoveTo,
    Break,
    PickUpLoot,
    PlaceBlockOn,
    Click,
    CheckBlock,
    CheckEntity,
    CheckInventory,
    Attack
])

export const TestCasesSchema = z.object({
    meta: z.object({
        id: z.string(),
        time: z.iso.datetime({ local: true }),
        x: z.number().int(),
        y: z.number().int().optional(),
        z: z.number().int(),
        username: z.string().regex(/^[a-zA-Z0-9_]{3,16}$/).optional(),
        address: z.string().optional(),
        level_csv: z.string(),
        output_csv: z.string().optional(),
        init_commands: z.array(z.string()).optional()
    }),
    test_cases: z.array(
        z.object({
            id: z.string(),
            actions: z.array(DiscriminizedActions),
        })
    )
})

export type TestCasesSchema = z.infer<typeof TestCasesSchema>;