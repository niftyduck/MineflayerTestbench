import fs from 'fs';
import fastcsv from 'fast-csv';
import { Vec3 } from 'vec3';
import { v4 as uuidv4 } from 'uuid';
import type { Bot } from 'mineflayer';

// Coords should be a vec3 of the bottom xyz corner of the level
async function buildLevel(bot: Bot, csv_file: string, coords: Vec3): Promise<any> {    
    bot.chat('/gamemode spectator @s');
    bot.chat(`/tp @s ${coords.x} ${coords.y} ${coords.z}`);
    
    const structure: string[][][] = await loadStructure(csv_file)
    
    // dy must be at least 2 block tall for the bot to fit
    const dy: number = Math.max(structure.length, 2);

    // since CSVs fill empty cells with commas, we can just use the first line's length
    const layer: string[][] = structure[0] || [];
    const dx: number = layer[0]?.length || 0;

    // find longest row for the z dimension
    const dz: number = structure.reduce((a: string[][], b: string[][]) => a.length > b.length ? a : b).length


    await bot.waitForChunksToLoad();

    // clear out area and surrouns with barriers
    bot.chat(`/fill ${coords.x - 1} ${coords.y - 1} ${coords.z - 1} ${coords.x + dx + 1} ${coords.y + dy + 1} ${coords.z + dz + 1} minecraft:barrier hollow`);
    bot.chat('/effect clear @s')
    bot.chat('/clear')
    // execute the kill command multiple times to also kill any items the entities may have dropped
    // also to handle slimes
    const kill_cmd = `/kill @e[type=!minecraft:player, x=${coords.x - 1}, y=${coords.y - 1}, z=${coords.z - 1}, dx=${dx + 1}, dy=${dy + 1}, dz=${dz + 1}]`
    bot.chat(kill_cmd);
    bot.chat(kill_cmd);
    bot.chat(kill_cmd);
    bot.chat(kill_cmd);

    const map: any = {};

    for (const [dy, layer] of structure.entries()) {
        for (const [dz, line] of layer.entries()) {
            for (const [dx, entry] of line.entries()) {
                const [thing, tag] = getTag(entry);
                // skip empty blocks
                if (!thing)
                    continue;

                const pos: Vec3 = new Vec3(coords.x + dx, coords.y + dy, coords.z + dz);
                // if it starts with @ it's an entity
                if (thing[0] === "@") {
                    let entity_id: string = thing.substring(1);

                    // if the entity is the player, tp us to that location already
                    // we can skip everything else, the player can't be traced as an entity nor can it take any NBT data
                    if (entity_id === bot.username){
                        bot.chat(`/tp @s ${pos.x} ${pos.y} ${pos.z}`)
                        continue;
                    }

                    let uuid = await summonEntity(entity_id, pos, bot, tag);
                    if (tag && uuid) {
                        map[tag] = uuid;
                    }
                } else { 
                    // otherwise assume it's a block
                    setBlock(thing, pos, bot);
                    if (tag) {
                        map[tag] = pos;
                    }
                }

            }
        }
    }

    // delay so entities can spawn and block info is propagated back to the bot
    await bot.waitForTicks(10);

    // populate map with block or entity instead of just their uuid or position
    for (const tag in map){
        const elem: Vec3 | string = map[tag];
        
        if (elem instanceof Vec3) {
            map[tag] = bot.blockAt(elem);
        } else {
            map[tag] = bot.nearestEntity((e) => e.uuid === elem);
        }
    }

    bot.chat('/gamemode survival @s');
    return map;
}

async function loadStructure(csv_file: string): Promise<string[][][]> {
    const structure: string[][][] = [];

    await new Promise((resolve) => {
        let current_layer: string[][] = [];

        fs.createReadStream(csv_file)
            .pipe(fastcsv.parse({ headers: false }))
            .on('data', (row) => {
                // "|" symbol is use to separate vertical layers in the y layer
                if (row[0].startsWith('|')) {
                    // remove pipe symbol
                    row[0] = row[0].substring(1);
                    structure.push(current_layer);
                    current_layer = [];
                }
                current_layer.push(row);
            }).on('end', resolve);
    })

    // remove the first layer if it's empty 
    // in other words allow users to start with a "|" without  creating an extra empty layer
    if (structure[0]?.length === 0) {
        structure.shift();
    }
    return structure;
}

function summonEntity(entity: string, pos: Vec3, bot: Bot, tag: string | null): string | undefined {
    let [entity_id, nbt] = getNbt(entity)
    nbt = nbt || "{data:{}}";
    let uuid: string | undefined;

    if (tag) {
        uuid = uuidv4();
        nbt = nbt.slice(0, -1) + `,UUID:${uuidToArray(uuid)}}`;
    }
    // we count the bot position as an entity
    bot.chat(`/summon ${entity_id} ${pos.x} ${pos.y} ${pos.z} ${nbt}`);

    return uuid;
}

function setBlock(block: string, pos: Vec3, bot: Bot): void {
    bot.chat(`/setblock ${pos.x} ${pos.y} ${pos.z} ${block}`);
}

function getTag(input: string): [string, string | null] {
    let bracket_level = 0;
    let split = -1;

    // Track bracket nesting and find the last unenclosed ^
    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (char === '{' || char === '[') {
            bracket_level++;
        } else if (char === '}' || char === ']') {
            bracket_level--;
        } else if (char === '^' && bracket_level === 0) {
            split = i;
        }
    }

    if (split !== -1 && bracket_level === 0) {
        return [
            input.substring(0, split),
            input.substring(split + 1)
        ];
    }

    // Otherwise return original string and empty string
    return [input, null];
}

function getNbt(input: string): [string, string | null] {
    let start: number = -1;
    let end: number = -1;
    let bracket_level: number = 0;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (char === '{') {
            if (start === -1) {
                start = i;
            }
            bracket_level++;
        } else if (char === '}') {
            end = i;
            bracket_level--;
        }
    }

    if (start !== -1 && bracket_level === 0) {
        return [
            input.substring(0, start),
            input.substring(start, end),
        ];
    }

    return [input, null];
}

// convert from standard dashed notation: eaec6bda-374c-4cf0-9e5d-e986a33d8a78 
// to miecraft signed int representation: [I;-353604646,927747312,-1638012538,-1556247944]
function uuidToArray(uuid: string): string{
    const hex = uuid.replace(/-/g, '');
    const buffer = Buffer.from(hex, 'hex');

    const int1 = buffer.readInt32BE(0);
    const int2 = buffer.readInt32BE(4);
    const int3 = buffer.readInt32BE(8);
    const int4 = buffer.readInt32BE(12);

    return `[I;${int1},${int2},${int3},${int4}]`;
}

export { buildLevel };