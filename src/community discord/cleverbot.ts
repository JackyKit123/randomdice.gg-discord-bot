import * as Discord from 'discord.js';
import axios from 'axios';
import cache from '../util/cache';
import cooldown from '../util/cooldown';
import { replaceAllMentionToText } from '../util/fetchMention';

const conversationTimeout = new Map<string, NodeJS.Timeout>();
const conversationIds = new Map<string, string | null>();
export default async function cleverBot(
    message: Discord.Message
): Promise<void> {
    const { content, channel, client, author, guild } = message;
    if (!client.user || !guild) return;

    let input = content.match(new RegExp(`<@!?${client.user.id}> ?(.*)`))?.[1];
    if (!input) return;
    input = replaceAllMentionToText(input, guild);
    if (
        await cooldown(message, 'cleverbot', {
            default: 20 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    const cs = conversationIds.get(`${channel.id}${author.id}`);
    const res = await axios.get(
        `http://www.cleverbot.com/getreply?key=${
            process.env.CLEVER_BOT_API_KEY
        }&input=${input}${cs ? `&cs=${cs}` : ''}`
    );
    conversationIds.set(`${channel.id}${author.id}`, res.data.cs);
    await channel.send(res.data.output);
    // reset conversation id after 10 minutes
    const timeout = conversationTimeout.get(`${channel.id}${author.id}`);
    if (timeout) {
        clearTimeout(timeout);
    }
    conversationTimeout.set(
        `${channel.id}${author.id}`,
        setTimeout(() => {
            conversationIds.set(`${channel.id}${author.id}`, null);
        }, 30 * 1000)
    );
}
