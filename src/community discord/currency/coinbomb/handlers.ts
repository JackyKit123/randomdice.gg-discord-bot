import channelIds from 'config/channelIds';
import { goldenPickaxe, pickaxe } from 'config/emojiId';
import { isProd } from 'config/env';
import { getCommunityDiscord } from 'config/guild';
import { Client, CommandInteraction } from 'discord.js';
import wait from 'util/wait';
import rickBomb from '../fun commands/rickbomb';
import spawnCoinbomb from './spawn';
import { BatchType, checkForActiveCoinbombInChannel } from './util';

export async function coinbombCommand(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { options, channel } = interaction;
    if (!channel) return;

    const arg = options.getString('type');

    if (await checkForActiveCoinbombInChannel(interaction)) return;

    let type: BatchType | undefined;

    switch (arg?.toLowerCase()) {
        case 'goldenpick':
            type = goldenPickaxe;
            break;
        case '⛏️':
            type = pickaxe;
            break;
        case '💵':
            type = 'small';
            break;
        case '💰':
            type = 'medium';
            break;
        case '💎':
            type = 'large';
            break;
        case 'rick':
            await rickBomb(interaction);
            return;
        default:
    }

    await spawnCoinbomb(channel, interaction, type);
}

export async function autoSpawn(client: Client<true>): Promise<void> {
    const guild = getCommunityDiscord(client);
    const channel = guild?.channels.cache.get(
        isProd
            ? channelIds.general // #general
            : channelIds['jackykit-playground-v2'] // #jackykit-playground
    );

    if (channel?.type !== 'GUILD_TEXT' || !channel?.isText()) {
        return;
    }
    if (isProd) {
        await wait(
            (
                await channel.messages.fetch({ limit: 50 })
            ).filter(msg => Date.now() - msg.createdTimestamp > 1000 * 60 * 5)
                .size *
                1000 *
                3
        );
    }
    await spawnCoinbomb(channel);
}
