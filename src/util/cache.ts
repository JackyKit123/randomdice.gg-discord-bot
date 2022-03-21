import firebase from 'firebase-admin';
import { database } from 'register/firebase';

export interface News {
    game: string;
    website: string;
}

interface ArenaValue {
    type: 'Main Dps' | 'Assist Dps' | 'Slow' | 'Value';
    assist: number;
    dps: number;
    slow: number;
    value: number;
}

interface Alternatives {
    desc: string;
    list: Array<number>;
}

export interface Dice {
    id: number;
    name: string;
    type:
        | 'Physical'
        | 'Magic'
        | 'Buff'
        | 'Merge'
        | 'Transform'
        | 'Install'
        | 'Debuff';
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
        guide?: string;
        news?: string;
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

export interface DeckGuide {
    archived: boolean;
    id: number;
    name: string;
    type: 'PvP' | 'Co-op' | 'Crew';
    diceList: Dice['id'][][];
    battlefield: Battlefield['id'];
    guide: string;
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

export interface MemberCurrencyProfile {
    balance: number;
    initiated?: true;
    prestige: number;
    hourly?: number;
    daily?: number;
    weekly?: number;
    monthly?: number;
    yearly?: number;
    weeklyChat?: number;
    dailyStreak?: number;
    hourlyStreak?: number;
    diceDrawn?: {
        [id: string]: number;
    };
    gamble?: {
        lose: number;
        gain: number;
    };
    nuked?: number;
    ignoreFunCommandPrompt?: string[];
}

export interface MemberCurrency {
    [memberId: string]: MemberCurrencyProfile;
}

export interface CurrencyConfig {
    multiplier: {
        channels: {
            [channelId: string]: number;
        };
        roles: {
            [roleId: string]: number;
        };
        blacklisted: string[];
    };
    weeklyWinners: string[];
}

interface TimerData {
    [key: string]: {
        guildId: string;
        channelId: string;
        messageId: string;
        hostId: string;
        endTime: number;
    };
}

interface CustomRoles {
    [memberId: string]: string;
}

interface CustomReact {
    [memberId: string]: string;
}

interface Afks {
    [memberId: string]: {
        afkMessage: string;
        timestamp: number;
    };
}

export interface ModLog {
    case: number;
    moderator: string;
    offender: string;
    action: 'warn' | 'mute' | 'unmute' | 'ban' | 'unban' | 'kick';
    timestamp: number;
    reason: string | null;
}

interface CacheObject {
    // eslint-disable-next-line camelcase
    decks_guide: DeckGuide[];
    dice: Dice[];
    decks: Deck[];
    news: News;
    'discord_bot/emoji': EmojiList;
    'discord_bot/registry': Registry;
    'discord_bot/help': Help[];
    'discord_bot/dev_help': Help[];
    'discord_bot/community/afk': Afks;
    'discord_bot/community/help': Help[];
    'discord_bot/community/applications': CommunityDiscordApplication[];
    'discord_bot/community/raffle': Raffle;
    'discord_bot/community/currency': MemberCurrency;
    'discord_bot/community/currencyConfig': CurrencyConfig;
    'discord_bot/community/customreact': CustomReact;
    'discord_bot/community/customroles': CustomRoles;
    'discord_bot/community/timer': TimerData;
    'discord_bot/community/modlog': ModLog[];
    'wiki/boss': Boss[];
    'wiki/tips': Tip[];
    'wiki/battlefield': Battlefield[];
    users: Users;
}

const cacheData: CacheObject = {
    // eslint-disable-next-line camelcase
    decks_guide: [],
    dice: [],
    decks: [],
    news: {
        game: '',
        website: '',
    },
    'discord_bot/emoji': [],
    'discord_bot/registry': {},
    'discord_bot/help': [],
    'discord_bot/dev_help': [],
    'discord_bot/community/afk': {},
    'discord_bot/community/help': [],
    'discord_bot/community/applications': [],
    'discord_bot/community/raffle': {
        ticketCost: 0,
        maxEntries: 0,
        endTimestamp: NaN,
        hostId: 0,
        tickets: {},
    },
    'discord_bot/community/currency': {},
    'discord_bot/community/currencyConfig': {
        multiplier: {
            channels: {},
            roles: {},
            blacklisted: [],
        },
        weeklyWinners: [],
    },
    'discord_bot/community/customreact': {},
    'discord_bot/community/customroles': {},
    'discord_bot/community/timer': {},
    'discord_bot/community/modlog': [],
    'wiki/boss': [],
    'wiki/tips': [],
    'wiki/battlefield': [],
    users: {},
};
export default cacheData;

export async function fetchDatabase(): Promise<void> {
    await Promise.all(
        Object.keys(cacheData).map(async key => {
            const ref = database.ref(key);
            const snapshotHandler = (
                snapshot: firebase.database.DataSnapshot
            ): void => {
                cacheData[key as keyof CacheObject] = snapshot.val();
            };
            ref.on('value', snapshotHandler);
            await ref.once('value').then(snapshotHandler);
        })
    );
}
