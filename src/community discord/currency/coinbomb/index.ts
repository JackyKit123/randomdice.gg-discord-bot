import {
    ApplicationCommandData,
    GuildMember,
    GuildTextBasedChannel,
    Message,
} from 'discord.js';
import { BatchType, GoldenPick } from './util';

export const activeCoinbombInChannel = new Map<
    GuildTextBasedChannel,
    | {
          rewarded: Map<GuildMember, number>;
          type: BatchType;
          maxCollectorsAllowed: number;
          coinbombMessage: Message;
          recursive: boolean;
          collectionTrigger: string;
          goldenPick: GoldenPick;
          reward: number;
          endMessage: (
              members: Map<GuildMember, number>,
              isGoldenPickaxeHolder?: GoldenPick
          ) => string;
      }
    | 'rick'
>();

export {
    coinbombCommand as coinbomb,
    autoSpawn as autoSpawnCoinbomb,
} from './handlers';

export { default as claimCoinbomb } from './claim';

export const commandData: ApplicationCommandData = {
    name: 'coinbomb',
    description: 'Spawns a coinbomb',
    defaultPermission: false,
    options: [
        {
            name: 'type',
            description: 'The type of coinbomb to spawn',
            type: 'STRING',
            required: false,
            choices: [
                {
                    name: '⛏️ Pickers',
                    value: '⛏️',
                },
                {
                    name: '⛏️ Golden Pickaxe',
                    value: 'goldenpick',
                },
                {
                    name: '💵 Small',
                    value: '💵',
                },
                {
                    name: '💰 Medium',
                    value: '💰',
                },
                {
                    name: '💎 Large',
                    value: '💎',
                },
                {
                    name: 'RICK, you know what it is',
                    value: 'rick',
                },
            ],
        },
    ],
};
