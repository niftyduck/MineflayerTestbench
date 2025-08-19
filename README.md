# MineflayerTestbench
Scripts to use Mineflayer for testing Minecraft

## How to run
Start by installing dependencies with 

`npm i`

Then you will need to compile the project with

`npm run build`

To actually run the project with default parameters, you can then use

`npm run start`

Supported commmand-line args:

- ***username***: the username for the bot. Defaults to "Bot" if unspecified
- ***level***: path to the csv file of the level, as described in [Level Format](#level-format). Defaults to "./test.csv"
- ***address***: the address and port of the minecraft server, accepts both IPV4 addresses as well as domains in the standard format address:port. Defaults to "localhost:25565"

Example format:

`npm run start address=rainbownetwork.co.uk:25565 username=itsAlisaa`

## Minecraft server setup
For the project to run you will need to set up a local vanilla Minecraft server for the bot to connect to. 

The latest Minecraft version MineFlayer currently supports is [1.21.1](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-1).

Since the bot doesn't have a linked Microsoft account, you will need to disable authentication which can be done by setting

`online-mode=false`

in the *server.properties* file.

On the first run with a specific username, to enable the bot to do what it has to do, you will need to give OP permission to the bot, if this the case, the bot will simply tell you to run `op <bot_name>` from the console. 

It is reccommended to use a void preset superflat world for the server.

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