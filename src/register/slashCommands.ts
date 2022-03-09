import { ApplicationCommandDataResolvable, Client } from 'discord.js';
import { commandData as boss } from 'commands/boss';
import { commandData as battlefield } from 'commands/battlefield';
import { commandData as ping } from 'commands/ping';
import { commandData as dice } from 'commands/dice';
import { commandData as deck } from 'commands/deck';
import { commandData as cardcalc } from 'commands/cardcalc';
import { commandData as drawUntil } from 'commands/drawUntil';
import { commandData as guide } from 'commands/guide';
import { commandData as help } from 'commands/help';
import { commandData as news } from 'commands/news';
import { commandData as randomDeck } from 'commands/randomdeck';
import { commandData as contact } from 'commands/sendContact';
import { commandData as postNow } from 'commands/postNow';
import { commandData as register } from 'commands/register';
import { commandData as links } from 'commands/sendLinks';

import { commandData as report } from 'community discord/report';
import { commandData as snipe } from 'community discord/snipe';
import { commandData as lock } from 'community discord/lock';
import { commandData as apply } from 'community discord/apply';
import { commandData as timer } from 'community discord/timer';
import { commandData as lfg } from 'community discord/lfg';
import { commandData as gtn } from 'community discord/gtn';
import { commandData as eventPing } from 'community discord/eventping';
import { commandData as customRole } from 'community discord/customRole';
import { commandData as myEmoji } from 'community discord/myEmoji';
import { commandData as rdRole } from 'community discord/rdRole';
import { commandData as wordle } from 'community discord/wordle';
import { commandData as balance } from 'community discord/currency/balance';
import { commandData as advertise } from 'community discord/promote';

import cacheData from 'util/cache';
import setCommandPermissions from './commandPermissions';

export default async function registerSlashCommands(
    client: Client
): Promise<void> {
    const baseCommands: ApplicationCommandDataResolvable[] = [
        boss(cacheData['wiki/boss']),
        battlefield(cacheData['wiki/battlefield']),
        cardcalc,
        deck,
        dice(cacheData.dice),
        ping,
        drawUntil(),
        guide(cacheData.decks_guide),
        help,
        news,
        randomDeck,
        contact,
        postNow,
        ...register,
        ...links,
    ];

    const communityCommands: ApplicationCommandDataResolvable[] = [
        ...report,
        ...snipe,
        ...lock,
        ...apply(cacheData['discord_bot/community/applications']),
        timer,
        lfg,
        gtn,
        eventPing,
        customRole,
        myEmoji,
        ...rdRole,
        wordle,
        ...balance,
        advertise,
    ];

    const setCommands = async (guildId = '', commands = baseCommands) => {
        if (guildId) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) return guild.commands.set(commands);
        }
        return client.application?.commands.set(commands);
    };

    let communityServerCommandsManager;
    if (process.env.NODE_ENV === 'development') {
        [, communityServerCommandsManager] = await Promise.all([
            setCommands(process.env.DEV_SERVER_ID),
            setCommands(
                process.env.COMMUNITY_SERVER_ID ?? '',
                communityCommands
            ),
        ]);
    } else if (process.env.NODE_ENV === 'production') {
        [, communityServerCommandsManager] = await Promise.all([
            setCommands(process.env.DEV_SERVER_ID),
            setCommands(process.env.COMMUNITY_SERVER_ID ?? ''),
            setCommands(
                process.env.COMMUNITY_SERVER_ID ?? '',
                communityCommands
            ),
            setCommands(process.env.COMMUNITY_APPEAL_SERVER_ID ?? ''),
            setCommands(),
        ]);
    }
    if (communityServerCommandsManager) {
        await setCommandPermissions(communityServerCommandsManager);
    }
}

export const getAscendingNumberArray = (
    length: number,
    text: string,
    start = 1
): {
    name: string;
    value: number;
}[] =>
    Array.from({ length }, (_, i) => ({
        name: `${text} ${start + i}`,
        value: start + i,
    }));

export const mapChoices = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: ({ name: string } & Record<string, any>)[]
): {
    name: string;
    value: string;
}[] =>
    data.length > 25
        ? []
        : data.map(({ name }) => ({
              name,
              value: name,
          }));
