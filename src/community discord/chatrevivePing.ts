import channelIds from 'config/channelIds';
import { getCommunityDiscord } from 'config/guild';
import Discord from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';

async function updateMulti() {
    let generalMulti =
        cache['discord_bot/community/currencyConfig'].multiplier.channels[
            channelIds.general
        ] || 0;
    await database
        .ref(
            `discord_bot/community/currencyConfig/multiplier/channels/${channelIds.general}`
        )
        .set(generalMulti + 10);
    setTimeout(async () => {
        generalMulti =
            cache['discord_bot/community/currencyConfig'].multiplier.channels[
                channelIds.general
            ] || 0;
        await database
            .ref(
                `discord_bot/community/currencyConfig/multiplier/channels/${channelIds.general}`
            )
            .set(generalMulti - 10);
    }, 60 * 60 * 1000);
    // this code was commented out because they do not want to ping chat revival anymore because it makes
    // the server look even more dead ;^)
    /*
    await channel.send(
        `<@&${roleIds['Chat Revive Ping']}> come and revive this dead chat. For the next 60 minutes, ${channel} has extra \`x10\` multiplier!`
    );
    */
}

let timeout: NodeJS.Timeout;
export default async function chatRevivePing(
    message: Discord.Message
): Promise<void> {
    const { channel } = message;
    if (channel.id !== channelIds.general) return;

    if (timeout) clearTimeout(timeout);

    timeout = setTimeout(async () => updateMulti(), 1000 * 60 * 60);
}

export async function fetchGeneralOnBoot(
    client: Discord.Client
): Promise<void> {
    const guild = getCommunityDiscord(client);
    const general = guild?.channels.cache.get(channelIds.general);
    if (!general?.isText()) return;
    try {
        const lastMessages = await general.messages.fetch();
        const lastMessage = lastMessages
            .filter(message => !message.author.bot)
            .first();
        if (!lastMessage) return;
        const deadChatTimer = Date.now() - lastMessage.createdTimestamp;
        const tenMinutes = 1000 * 60 * 60;
        if (!timeout) {
            timeout = setTimeout(
                async () => updateMulti(),
                tenMinutes - deadChatTimer
            );
        }
    } catch {
        // suppress error
    }
}
