import { Client } from 'discord.js';
import { fixClownNicknamesOnReboot } from 'community discord/currency/fun commands/clown';
import { fetchGeneralOnBoot } from 'community discord/chatrevivePing';
import { autoSpawnCoinbomb } from 'community discord/currency/coinbomb';
import { resetWeeklyTop5 } from 'community discord/currency/leaderboard';
import { setRaffleTimerOnBoot } from 'community discord/currency/raffle';
import serverClock from 'community discord/serverClock';
import { registerTimer } from 'community discord/timer';
import logMessage, { logError } from 'util/logMessage';
import { fetchDatabase } from 'util/cache';
import databaseListener from 'commands/databaseListener';
import purgeRolesOnReboot from 'community discord/util/purgeRolesOnReboot';
import registerSlashCommands from 'register/commandData';
import { fetchCommunityDiscordInviteUrls } from 'community discord/moderation/forbidExternalInvite';

export default async function ready(client: Client<true>): Promise<void> {
    client.user.setActivity('/help', {
        type: 'PLAYING',
    });
    const log = async (message: string) => {
        // eslint-disable-next-line no-console
        console.log(message);
        await logMessage(client, 'info', message);
    };

    try {
        databaseListener(client);
        await log(
            `Timestamp: ${new Date().toTimeString()}, bot is booting on ${
                process.env.NODE_ENV
            }`
        );
        await Promise.all([
            fetchDatabase(),
            purgeRolesOnReboot(client, '🤡', 'rick', 'Inked'),
            fixClownNicknamesOnReboot(client),
            fetchCommunityDiscordInviteUrls(client),
        ]);
        await log(
            'Database is ready\nCleaned up previous roles and nicknames\nBot is fully up and running\nStarting Recursive functions: chat revive ping, auto raffle, auto spawn coinbomb, timers, server clock'
        );
        // call these after database ready
        await Promise.all([
            await registerSlashCommands(client),
            fetchGeneralOnBoot(client),
            setRaffleTimerOnBoot(client),
            autoSpawnCoinbomb(client),
            resetWeeklyTop5(client),
            registerTimer(client),
            serverClock(client),
        ]);
    } catch (err) {
        await logError(client, err, 'client#ready');
    }
}
