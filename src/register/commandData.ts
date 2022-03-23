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
import { commandData as apply } from 'community discord/staff application';
import { commandData as timer } from 'community discord/timer';
import { commandData as lfg } from 'community discord/lfg';
import { commandData as gtn } from 'community discord/gtn';
import { commandData as eventPing } from 'community discord/eventping';
import { commandData as customRole } from 'community discord/customRole';
import { commandData as myEmoji } from 'community discord/myEmoji';
import { commandData as rdRole } from 'community discord/rdRole';
import { commandData as wordle } from 'community discord/wordle';
import { commandData as afk } from 'community discord/afk';
import { commandData as balance } from 'community discord/currency/balance';
import { commandData as advertise } from 'community discord/promote';

import { commandData as dd } from 'community discord/currency/drawDice';
import { commandData as profile } from 'community discord/currency/profile';
import { commandData as coinflip } from 'community discord/currency/coinflip';
import { commandData as leaderboard } from 'community discord/currency/leaderboard';
import { commandData as prestige } from 'community discord/currency/prestige';
import { commandData as raffle } from 'community discord/currency/raffle';
import { commandData as timed } from 'community discord/currency/timed';
import { commandData as currency } from 'community discord/currency/currency';
import { commandData as coinbomb } from 'community discord/currency/coinbomb';
import { commandData as multiplier } from 'community discord/currency/multiplier';
import { commandData as nuke } from 'community discord/currency/nuke';

import { commandData as welcomerick } from 'community discord/currency/fun commands/welcomerick';
import { commandData as bon } from 'community discord/currency/fun commands/bon';
import { commandData as imitate } from 'community discord/currency/fun commands/imitate';
import { commandData as clown } from 'community discord/currency/fun commands/clown';
import { commandData as shush } from 'community discord/currency/fun commands/shush';
import { commandData as rickbomb } from 'community discord/currency/fun commands/rickbomb';
import { commandData as bedtime } from 'community discord/currency/fun commands/bedtime';

import { commandData as reboot } from 'dev-commands/reboot';
import { commandData as setEmoji } from 'dev-commands/setEmoji';
import { commandData as fetchInvites } from 'dev-commands/fetchInvites';
import { commandData as stat } from 'dev-commands/stat';
import { commandData as version } from 'dev-commands/version';

import { commandData as moderation } from 'community discord/moderation';
import { commandData as modlog } from 'community discord/moderation/modlog';
import { commandData as quickMod } from 'community discord/moderation/quickMod';
import { commandData as closeAppeal } from 'community discord/moderation/ban appeal/closeAppeal';

import cacheData from 'util/cache';
import {
    banAppealDiscordId,
    communityDiscordId,
    devTestDiscordId,
} from 'config/guild';
import setCommandPermissions from './commandPermissions';

export default async function registerSlashCommands(
    client: Client
): Promise<void> {
    const baseCommands: ApplicationCommandDataResolvable[] = [
        boss(cacheData['wiki/boss']),
        battlefield(cacheData['wiki/battlefield']),
        cardcalc,
        deck,
        dice(),
        ping,
        drawUntil(),
        guide(),
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
        dd,
        ...profile,
        coinflip,
        ...leaderboard,
        prestige,
        raffle,
        ...timed,
        currency,
        coinbomb,
        multiplier,
        welcomerick,
        bon,
        ...imitate,
        clown,
        ...shush,
        rickbomb,
        bedtime,
        afk,
        nuke,
        ...moderation,
        ...modlog,
        ...quickMod,
    ];

    const devCommands: ApplicationCommandDataResolvable[] = [
        reboot,
        setEmoji,
        stat,
        fetchInvites,
        version,
    ];

    const appealCommands: ApplicationCommandDataResolvable[] = [...closeAppeal];

    const setCommands = async (guildId = '', commands = baseCommands) => {
        if (guildId) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) return guild.commands.set(commands);
        }
        return client.application?.commands.set(commands);
    };

    const [communityServerCommandsManager, appealServerCommandsManager] =
        await Promise.all([
            setCommands(communityDiscordId, communityCommands),
            setCommands(banAppealDiscordId, appealCommands),
            setCommands(devTestDiscordId, devCommands),
            setCommands(),
        ]);
    if (communityServerCommandsManager) {
        await setCommandPermissions(communityServerCommandsManager);
    }
    if (appealServerCommandsManager) {
        await setCommandPermissions(appealServerCommandsManager);
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
    data: { name: string }[]
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
