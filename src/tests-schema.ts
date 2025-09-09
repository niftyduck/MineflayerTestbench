import { z } from 'zod';
import type { Bot } from 'mineflayer';

import { attack, breakBlock, click, moveTo, selectItem, pickUpLoot, placeBlockOn, useOnEntity, checkBlock, checkEntity, anvil, checkInventory, sneak } from './abstraction.js'

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

const Sneak = ActionSchema.extend({
    name: z.literal("sneak"),
    state: z.boolean()
}).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return await sneak(bot, data.state)
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

const AnvilOperation = ActionSchema.extend({
    name: z.literal("anvil"),
    target: z.string(),
    item_one: z.string().optional(),
    item_two: z.string().optional(),
    custom_name: z.string().optional(),
}).refine((data) => !(!data.item_two && !data.custom_name), 
    {
        message: "custom_name is mandatory when item_two is not provided"
    }
).transform((data) => ({
    ...data,
    execute: async (bot: Bot, map: any) => {
        return await anvil(bot, map[data.target], data.item_one, data.item_two, data.custom_name, data.verbose);
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
    Attack,
    Sneak,
    AnvilOperation
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