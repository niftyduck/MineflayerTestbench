import type { Block } from 'prismarine-block';
import type { Entity } from 'prismarine-entity';
import type { Item } from 'prismarine-item';

// because instanceof doesn't work...
export function isBlock(target: any): target is Block {
    return target.constructor.name == "Block";
}

export function isEntity(target: any): target is Entity {
    return target.constructor.name == "Entity";
}

export function isItem(target: any): target is Item {
    return target.constructor.name == "Item";
}

