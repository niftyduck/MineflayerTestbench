import fs from 'fs';
import fastcsv from 'fast-csv';
import { Vec3 } from 'vec3';
import { v4 as uuidv4 } from 'uuid';


// Coords should be a vec3 of the bottom xyz corner of the level
async function buildLevel(bot, csv_file, coords) {
    const rows = [];
    const map = {};

    bot.chat('/gamemode spectator @s');
    bot.chat(`/tp @s ${coords.x} ${coords.y} ${coords.z}`);

    await bot.waitForChunksToLoad();

    let dy = 0;
    await new Promise((resolve) => {
        fs.createReadStream(csv_file)
            .pipe(fastcsv.parse({ headers: false }))
            .on('data', (row) => {
                // count dy
                if (row[0][0] === '|')
                    dy++;
                rows.push(row)
            })
            .on('end', resolve);
    }
    )

    const dx = Math.ceil(rows.length / dy); // TODO: actually do this properly and ensure it's tall enough
    const dz = rows[0].length;

    // clear out area and surrouns with barriers
    bot.chat(`/fill ${coords.x - 1} ${coords.y - 1} ${coords.z - 1} ${coords.x + dx + 1} ${coords.y + dy + 1} ${coords.z + dz + 1} minecraft:barrier hollow`);
    bot.chat('/clear')
    // execute the kill command multiple times to also kill any items the entities may have dropped
    const kill_cmd = `/kill @e[type=!minecraft:player, x=${coords.x - 1}, y=${coords.y - 1}, z=${coords.z - 1}, dx=${dx + 1}, dy=${dy + 1}, dz=${dz + 1}]`
    bot.chat(kill_cmd);
    bot.chat(kill_cmd);
    bot.chat(kill_cmd);

    let y = coords.y
    let x = coords.x
    for (const row of rows) {
        if (row[0][0] === "|") {
            row[0] = row[0].substring(1);
            x = coords.x
            y++;
        }
        for (const [dz, element] of row.entries()) {
            const z = coords.z + dz;
            const pos = new Vec3(x, y, z)
            const [thing, tag] = getTag(element);

            let res;
            // @ will be used to represent entities
            if (thing[0] === "@") {
                res = await summonEntity(thing.substring(1), pos, bot, tag);
            } else {  // otherwise assume it's a block
                res = setBlock(thing, pos, bot, tag);
            }

            if (tag) {
                map[tag] = res;
            }
        }
        x++;
    }

    bot.chat('/gamemode survival @s');
    return map;
}

async function summonEntity(entity, pos, bot, tag) {
    let [entity_id, nbt] = getNbt(entity)
    nbt = nbt || "{data:{}}";
    let uuid;
    if (tag) {
        uuid = uuidv4();
        nbt = nbt.slice(0, -1) + `,UUID:${uuidToArray(uuid)}}`;
    }
    // we count the bot position as an entity
    if (entity_id == bot.username) {
        bot.chat(`/tp @s ${pos.x} ${pos.y} ${pos.z}`);
    } else {
        bot.chat(`/summon ${entity_id} ${pos.x} ${pos.y} ${pos.z} ${nbt}`);
    }

    if (tag) {
        // hoorrible hack, wait for the entity to spawn
        await bot.waitForTicks(10);
        return bot.nearestEntity((e) => e.uuid === uuid)
    }

    return null
}

function setBlock(block, pos, bot, tag) {
    bot.chat(`/setblock ${pos.x} ${pos.y} ${pos.z} ${block}`)
    if (tag) {
        return bot.blockAt(pos);
    }
    return null
}

function getTag(input) {
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

function getNbt(input) {
    let start = -1;
    let end = -1;
    let bracket_level = 0;
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
        ]
    }

    return [input, null]
}

// convert from standard dashed notation: eaec6bda-374c-4cf0-9e5d-e986a33d8a78 
// to miecraft signed int representation: [I;-353604646,927747312,-1638012538,-1556247944]
function uuidToArray(uuid) {
    const hex = uuid.replace(/-/g, '');
    const buffer = Buffer.from(hex, 'hex');

    const int1 = buffer.readInt32BE(0);
    const int2 = buffer.readInt32BE(4);
    const int3 = buffer.readInt32BE(8);
    const int4 = buffer.readInt32BE(12);

    return `[I;${int1},${int2},${int3},${int4}]`;
}

export { buildLevel };