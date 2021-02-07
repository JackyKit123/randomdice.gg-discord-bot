import * as admin from 'firebase-admin';

export interface News {
    game: string;
    website: string;
}

export interface DeckGuide {
    archived: boolean;
    id: number;
    name: string;
    type: 'PvP' | 'Co-op' | 'Crew';
    diceList: Dice['id'][][];
    battlefield: Battlefield['id'];
    guide: string;
}

interface Alternatives {
    desc: string;
    list: Array<Dice['name']>;
}

interface ArenaValue {
    type: 'Main Dps' | 'Assist Dps' | 'Slow' | 'Value';
    assist: number;
    dps: number;
    slow: number;
    value: number;
}

export interface Dice {
    id: number;
    name: string;
    type: 'Physical' | 'Magic' | 'Buff' | 'Merge' | 'Transform';
    desc: string;
    detail: string;
    img: string;
    target: 'Front' | 'Strongest' | 'Random' | 'Weakest' | '-';
    rarity: 'Common' | 'Rare' | 'Unique' | 'Legendary';
    atk: number;
    spd: number;
    eff1: number;
    eff2: number;
    nameEff1: string;
    nameEff2: string;
    unitEff1: string;
    unitEff2: string;
    cupAtk: number;
    cupSpd: number;
    cupEff1: number;
    cupEff2: number;
    pupAtk: number;
    pupSpd: number;
    pupEff1: number;
    pupEff2: number;
    alternatives?: Alternatives;
    arenaValue: ArenaValue;
}

export interface Deck {
    battlefield: number;
    guide: number[];
    id: number;
    type: 'PvP' | 'Co-op' | 'Crew' | '-';
    rating: {
        default: number;
        c8?: number;
        c9?: number;
        c10?: number;
    };
    decks: Dice['id'][][];
}

export interface EmojiList {
    [key: number]: string;
}

export interface Registry {
    [key: string]: {
        guide: string;
        news: string;
    };
}

export interface Boss {
    id: number;
    name: string;
    img: string;
    desc: string;
}

export interface Tip {
    id: number;
    img: string;
    desc: string;
}

export interface Battlefield {
    id: number;
    name: string;
    img: string;
    desc: string;
    source: string;
    buffName: string;
    buffValue: number;
    buffUnit: string;
    buffCupValue: number;
}

export interface Help {
    category: string;
    commands: { command: string; description: string }[];
}

export interface Users {
    [uid: string]: {
        'linked-account': {
            discord?: string;
            patreon?: string;
        };
        'patreon-tier'?: number;
    };
}

export interface CommunityDiscordApplication {
    position: string;
    isOpen: boolean;
    questions: string[];
}

export interface Raffle {
    ticketCost: number;
    maxEntries: number;
    endTimestamp: number;
    hostId: number;
    tickets: {
        [ticketNumber: number]: string;
    };
}

interface CacheObject {
    decks_guide: DeckGuide[];
    dice: Dice[];
    decks: Deck[];
    news: News;
    'discord_bot/emoji': EmojiList;
    'discord_bot/registry': Registry;
    'discord_bot/help': Help[];
    'discord_bot/dev_help': Help[];
    'discord_bot/community/applications': CommunityDiscordApplication[];
    'discord_bot/community/raffle': Raffle;
    'wiki/boss': Boss[];
    'wiki/tips': Tip[];
    'wiki/battlefield': Battlefield[];
    users: Users;
}

const cacheData = {
    // eslint-disable-next-line @typescript-eslint/camelcase
    decks_guide: [] as DeckGuide[],
    dice: [] as Dice[],
    decks: [] as Deck[],
    news: {
        game: '',
        website: '',
    },
    'discord_bot/emoji': [] as EmojiList,
    'discord_bot/registry': {} as Registry,
    'discord_bot/help': [] as Help[],
    'discord_bot/dev_help': [] as Help[],
    'discord_bot/community/applications': [] as CommunityDiscordApplication[],
    'discord_bot/community/raffle': {
        ticketCost: 0,
        maxEntries: 0,
        endTimestamp: NaN,
        hostId: 0,
        tickets: {},
    } as Raffle,
    'wiki/boss': [] as Boss[],
    'wiki/tips': [] as Tip[],
    'wiki/battlefield': [] as Battlefield[],
    users: {} as Users,
};
export default cacheData;

export function fetchAll(database: admin.database.Database): void {
    Object.keys(cacheData).forEach(key => {
        const ref = database.ref(key);
        const snapshotHandler = (
            snapshot: admin.database.DataSnapshot
        ): void => {
            cacheData[key as keyof CacheObject] = snapshot.val();
        };
        ref.on('value', snapshotHandler);
        ref.once('value').then(snapshotHandler);
    });
}
