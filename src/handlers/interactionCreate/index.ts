import { Interaction } from 'discord.js';
import logMessage from 'util/logMessage';
import { baseCommands } from 'register/commandCase';

import snipe, { deleteSnipe } from 'community discord/snipe';
import apply, { configApps, closeApplication } from 'community discord/apply';
import { report, closeReport } from 'community discord/report';
import lock from 'community discord/lock';
import timer from 'community discord/timer';
import lfg from 'community discord/lfg';
import gtn from 'community discord/gtn';
import wordle from 'community discord/wordle';
import eventPing from 'community discord/eventping';
import customRole from 'community discord/customRole';
import myEmoji from 'community discord/myEmoji';
import { myClass, myCrit } from 'community discord/rdRole';
import advertise from 'community discord/promote';

import drawDice from 'community discord/currency/drawDice';
import balance from 'community discord/currency/balance';
import profile, { profileButtons } from 'community discord/currency/profile';
import coinflip from 'community discord/currency/coinflip';
import leaderboard from 'community discord/currency/leaderboard';
import prestige from 'community discord/currency/prestige';
import raffle, {
    addRafflePingRole,
    joinRaffleButton,
} from 'community discord/currency/raffle';
import timed from 'community discord/currency/timed';
import currency from 'community discord/currency/currency';
import { spawnCoinbomb } from 'community discord/currency/coinbomb';
import multiplier from 'community discord/currency/multiplier';
import nuke from 'community discord/currency/nuke';

import bon from 'community discord/currency/fun commands/bon';
import welcomerick from 'community discord/currency/fun commands/welcomerick';
import afk, { removeAfkListener } from 'community discord/afk';
import bedtime from 'community discord/currency/fun commands/bedtime';
import imitate from 'community discord/currency/fun commands/imitate';
import clown from 'community discord/currency/fun commands/clown';
import shush, { unShush } from 'community discord/currency/fun commands/shush';
import rickbomb from 'community discord/currency/fun commands/rickbomb';

import fetchInvites from 'dev-commands/fetchInvites';
import setEmoji from 'dev-commands/setEmoji';
import statistic from 'dev-commands/stat';
import reboot from 'dev-commands/reboot';
import version from 'dev-commands/version';

import closeAppeal from 'community discord/moderation/ban appeal/closeAppeal';

import channelIds from 'config/channelIds';
import { nullDice } from 'config/emojiId';
import { spyLogBanHandler } from 'community discord/spy';
import moderation from 'community discord/moderation';
import modlog from 'community discord/moderation/modlog';
import {
    banAppealDiscordId,
    communityDiscordId,
    devTestDiscordId,
    isDevTestDiscord,
} from 'config/guild';
import { isDev, isProd } from 'config/env';

export default async function interactionCreate(
    interaction: Interaction
): Promise<void> {
    const { guildId, channelId, client, guild, user } = interaction;
    const testChannelId = channelIds['jackykit-playground-v2'];

    try {
        const asyncPromisesCapturer: Promise<unknown>[] = [];
        if (interaction.inCachedGuild()) {
            if (
                interaction.isCommand() &&
                ((isDev && isDevTestDiscord(guild)) ||
                    (isDev && channelId === testChannelId) ||
                    (isProd && isDevTestDiscord(guild)) ||
                    (isProd && channelId === testChannelId))
            ) {
                asyncPromisesCapturer.push(
                    baseCommands(interaction, interaction.commandName)
                );
            }
            switch (guildId) {
                case devTestDiscordId:
                    if (interaction.isCommand()) {
                        switch (interaction.commandName) {
                            case 'createinvites':
                                await fetchInvites(interaction);
                                break;
                            case 'setemoji':
                                await setEmoji(interaction);
                                break;
                            case 'statistic':
                                await statistic(interaction);
                                break;
                            case 'reboot':
                                await reboot(interaction);
                                break;
                            case 'version':
                                await version(interaction);
                                break;
                            default:
                        }
                    }
                    break;
                case communityDiscordId:
                    if (
                        (isDev &&
                            channelId !==
                                channelIds['jackykit-playground-v2']) ||
                        (isProd && channelId === testChannelId)
                    )
                        return;

                    asyncPromisesCapturer.push(
                        removeAfkListener(interaction, interaction.user)
                    );
                    if (interaction.isButton()) {
                        switch (interaction.customId) {
                            case 'dd':
                                await drawDice(interaction);
                                break;
                            case 'application-submit':
                            case 'application-cancel':
                                await closeApplication(interaction);
                                break;
                            case 'delete-snipe':
                            case 'trash-snipe':
                                await deleteSnipe(interaction);
                                break;
                            case 'profile-👤':
                            case 'profile-⏲️':
                            case 'profile-🎰':
                            case `profile-${nullDice}`:
                            case `profile-☢️`:
                            case 'profile-❌':
                                await profileButtons(interaction);
                                break;
                            case 'coinflip-head':
                            case 'coinflip-tail':
                                await coinflip(interaction);
                                break;
                            case 'get-raffle-ping-role':
                                await addRafflePingRole(interaction);
                                break;
                            case 'raffle-join-1':
                            case 'raffle-join-5':
                            case 'raffle-join-10':
                            case 'raffle-join-20':
                            case 'raffle-join-50':
                            case 'raffle-join-max':
                                await joinRaffleButton(interaction);
                                break;
                            case 'spy-log-ban':
                                await spyLogBanHandler(interaction);
                                break;
                            default:
                        }
                    }
                    if (interaction.isCommand()) {
                        switch (interaction.commandName) {
                            case 'snipe':
                            case 'editsnipe':
                                await snipe(interaction);
                                break;
                            case 'application':
                                await configApps(interaction);
                                break;
                            case 'apply':
                                await apply(interaction);
                                break;
                            case 'report':
                                await report(interaction);
                                break;
                            case 'closereport':
                                await closeReport(interaction);
                                break;
                            case 'lock':
                            case 'unlock':
                                await lock(interaction);
                                break;
                            case 'timer':
                                await timer(interaction);
                                break;
                            case 'lfg':
                                await lfg(interaction);
                                break;
                            case 'gtn':
                                await gtn(interaction);
                                break;
                            case 'eventping':
                                await eventPing(interaction);
                                break;
                            case 'customrole':
                                await customRole(interaction);
                                break;
                            case 'myemoji':
                                await myEmoji(interaction);
                                break;
                            case 'myclass':
                                await myClass(interaction);
                                break;
                            case 'mycrit':
                                await myCrit(interaction);
                                break;
                            case 'advertise':
                                await advertise(interaction);
                                break;
                            case 'dd':
                                await drawDice(interaction);
                                break;
                            case 'wordle':
                                await wordle(interaction);
                                break;
                            case 'balance':
                                await balance(interaction);
                                break;
                            case 'profile':
                                await profile(interaction);
                                break;
                            case 'coinflip':
                                await coinflip(interaction);
                                break;
                            case 'leaderboard':
                                await leaderboard(interaction);
                                break;
                            case 'prestige':
                                await prestige(interaction);
                                break;
                            case 'raffle':
                                await raffle(interaction);
                                break;
                            case 'hourly':
                                await timed(interaction, 'hourly');
                                break;
                            case 'daily':
                                await timed(interaction, 'daily');
                                break;
                            case 'weekly':
                                await timed(interaction, 'weekly');
                                break;
                            case 'monthly':
                                await timed(interaction, 'monthly');
                                break;
                            case 'yearly':
                                await timed(interaction, 'yearly');
                                break;
                            case 'currency-audit':
                                await currency(interaction);
                                break;
                            case 'coinbomb':
                                await spawnCoinbomb(interaction);
                                break;
                            case 'multiplier':
                                await multiplier(interaction);
                                break;
                            case 'bon':
                                await bon(interaction);
                                break;
                            case 'welcomerick':
                                await welcomerick(interaction);
                                break;
                            case 'afk':
                                await afk(interaction);
                                break;
                            case 'bedtime':
                                await bedtime(interaction);
                                break;
                            case 'yomama':
                            case 'moongirl':
                                await imitate(interaction);
                                break;
                            case 'clown':
                                await clown(interaction);
                                break;
                            case 'shush':
                                await shush(interaction);
                                break;
                            case 'unshush':
                                await unShush(interaction);
                                break;
                            case 'rickbomb':
                            case 'rickcoin':
                                await rickbomb(interaction);
                                break;
                            case 'nuke':
                                await nuke(interaction);
                                break;
                            case 'warn':
                            case 'mute':
                            case 'ban':
                            case 'kick':
                            case 'unban':
                            case 'unmute':
                            case 'hackwarn':
                            case 'hackban':
                                await moderation(interaction);
                                break;
                            case 'modlog':
                                await modlog(interaction);
                                break;
                            default:
                        }
                    }
                    if (interaction.isUserContextMenu()) {
                        switch (interaction.commandName) {
                            case 'Check Balance':
                                await balance(interaction);
                                break;
                            case 'Show Profile':
                                await profile(interaction);
                                break;
                            default:
                        }
                    }
                    if (interaction.isContextMenu()) {
                        switch (interaction.commandName) {
                            case 'Report this message':
                                await report(interaction);
                                break;
                            default:
                        }
                    }
                    break;
                case banAppealDiscordId:
                    if (interaction.isCommand())
                        switch (interaction.commandName) {
                            case 'accept':
                            case 'reject':
                            case 'falsebanned':
                                await closeAppeal(interaction);
                                break;
                            default:
                        }
                    if (interaction.isButton()) {
                        switch (interaction.customId) {
                            case 'appeal-accept':
                            case 'appeal-reject':
                            case 'appeal-falsebanned':
                                await closeAppeal(interaction);
                                break;
                            default:
                        }
                    }
                    if (interaction.isUserContextMenu()) {
                        switch (interaction.commandName) {
                            case 'Accept Appeal':
                            case 'Reject Appeal':
                            case 'Not Guilty':
                                await closeAppeal(interaction);
                                break;
                            default:
                        }
                    }
                    break;
                default:
            }
        }
        await Promise.all(asyncPromisesCapturer);
    } catch (err) {
        try {
            if (
                interaction.isButton() ||
                interaction.isCommand() ||
                interaction.isContextMenu()
            ) {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(
                        `Oops, something went wrong:\n${
                            (err as Error).message ?? err
                        }`
                    );
                } else {
                    await interaction.reply(
                        `Oops, something went wrong:\n${
                            (err as Error).message ?? err
                        }`
                    );
                }
            }
        } finally {
            let commandName = '';
            if (
                interaction.isCommand() ||
                interaction.isContextMenu() ||
                interaction.isUserContextMenu()
            ) {
                ({ commandName } = interaction);
            } else if (interaction.isMessageComponent()) {
                commandName = interaction.customId;
            }
            await logMessage(
                client,
                'warning',
                `Oops, something went wrong when executing ${
                    interaction.type
                } interaction \`${commandName}\` in ${
                    guild ? `server ${guild.name}` : `DM with <@${user.id}>`
                } : ${(err as Error).stack ?? (err as Error).message ?? err}`
            );
        }
    }
}
