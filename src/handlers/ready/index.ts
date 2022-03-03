import { Client } from 'discord.js';
import { fetchApps } from 'community discord/apply';
import { purgeRolesOnReboot as purgeMoonedRoles } from 'community discord/currency/fun commands/moon';
import { purgeRolesOnReboot as purgeClownRoles } from 'community discord/currency/fun commands/clown';
import { fetchGeneralOnBoot } from 'community discord/chatrevivePing';
import { fetchExistingCrewAds } from 'community discord/checkCrewAds';
import { pickCoinsInit } from 'community discord/currency/coinbomb';
import { weeklyAutoReset } from 'community discord/currency/leaderboard';
import { setRaffleTimerOnBoot } from 'community discord/currency/raffle';
import infoVC from 'community discord/infoVC';
import { fetchAutoReactionRegistry } from 'community discord/myEmoji';
import { fetchSpyLogOnBoot } from 'community discord/spy';
import { registerTimer } from 'community discord/timer';
import logMessage from 'dev-commands/logMessage';
import { fetchAll } from 'util/cache';
import updateListener from 'util/updateListener';
import registerSlashCommands from 'register/slashCommands';

export default async function ready(client: Client<true>): Promise<void> {
    // eslint-disable-next-line no-unused-expressions
    client.user?.setActivity('.gg help', {
        type: 'PLAYING',
    });
    const bootMessage = `Timestamp: ${new Date().toTimeString()}, bot is booted on ${
        process.env.NODE_ENV
    }`;
    try {
        updateListener(client);
        await logMessage(client, 'info', bootMessage);
        // eslint-disable-next-line no-console
        console.log(bootMessage);
        await Promise.all([
            purgeMoonedRoles(client),
            purgeClownRoles(client),
            fetchApps(client),
            fetchGeneralOnBoot(client),
            pickCoinsInit(client),
            fetchExistingCrewAds(client),
            fetchSpyLogOnBoot(client),
            fetchAll(),
        ]);
        // call these after database ready
        await Promise.all([
            registerSlashCommands(client),
            setRaffleTimerOnBoot(client),
            weeklyAutoReset(client),
            registerTimer(client),
            fetchAutoReactionRegistry(client),
        ]);
        await infoVC(client);
    } catch (err) {
        await logMessage(
            client,
            'warning',
            `Oops, something went wrong in client#Ready : ${
                (err as Error).stack ?? (err as Error).message ?? err
            }`
        );
    }
}
