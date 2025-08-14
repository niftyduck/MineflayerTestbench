# Mineflayer based test concretizer for IV4XR-MBT

## Level format
The levels are defined in a `.csv` file format, every cell can be an item, entity or block.

### Inventory

The first row of the file is always assumed to be the hotbar, and as such the first 9 items will be loaded into bot in the correspondin slots.

The following up to 3 rows will be treated in a similar way to load the rest of the inventory, starting from the topmost row down.
Note that unlike for the hotbar, the items can all be placed in one line and they will be loaded as expected. If this is done, further rows in the inventory section are not supported.

The format of items both in the hotbar is the same as in the `/give command`:

`item_id[components] <count>`

For example:

`iron_ingot 64`

`iron_pickaxe[damage=140]`

`minecraft:cake`

are all valid examples, the namespace can be omitted, as well as the components or the count, which is assumed to be 1 unless specified

### Structure
A structure has to also be defined in the file. This will be generated at the coordinates decided at runtime and will be constructed inside a barrier block cage with the minimum size to fit the structure, and height being 3 blocks minimum. This can be increased by adding empty rows and columns.

The beginning of the structure section is marked by having a `|` *"pipe"* symbol at the beginning of the line. This symbol will also be used to separate layers of the structure. 

#### Blocks
The format for blocks is the same as for the in-game `/setblock` command:

`block_id[blockstate]{NBT}`

For example:

`minecraft:iron_block`

`piston[facing=south]`

`hopper{Items:[{Slot:0b,id:"minecraft:stone",count:1}]}`

#### Entities
Entities are maked by starting with an `@` symbol and use the following format:

`@entity_id{NBT}`

For example:

`@minecraft:bee{NoAI:1b}`

`@pig`

`@minecraft:armor_stand`

Note that there is also a specific case for the player `@player` where if instead of a valid entity id we put the 'player', that position will be where the agent spawns in, regardless of the name of the agent. 

#### Tags/IDs
To simplify dealing with coordinates and entity selectors, a tagging system similar to the one used in [LabRecruits](https://github.com/iv4xr-project/labrecruits/wiki/Defining-a-level) has been implemented. Using the `^` symbol at the end of any block or entityt definition will cause anything following it to become a tag of the preceding block or entity. 

Examples:

`@bee^mob1`

`chest[facing=south]{Items:[{Slot:0b,id:"minecraft:stone",count:1}]}^chest`

`minecraft:clay^foobar`

Note that player entities are excluded `@Agent1^agent` will fail to even place the agent