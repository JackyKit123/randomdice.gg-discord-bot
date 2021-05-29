import * as Discord from 'discord.js';
import axios from 'axios';
import cache from '../helper/cache';

const conversationIds = new Map<string, string>();
export default async function cleverBot(
    message: Discord.Message
): Promise<void> {
    const { content, channel, client, author, guild } = message;
    if (!client.user || !guild) return;

    const { users } = cache;
    const userIsDonator = Object.values(users).some(
        user =>
            user['linked-account'].discord === author.id &&
            Boolean(user['patreon-tier'])
    );
    const input = content.match(
        new RegExp(`<@!?${client.user.id}> ?(.*)`)
    )?.[1];
    if (!input) return;
    if (
        !userIsDonator &&
        author.id !== '195174308052467712' &&
        (channel as Discord.TextChannel).parentID !== '804227071765118976'
    ) {
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('I cannot respond here.')
                .setColor('#ff0000')
                .setDescription(
                    `Responding in ${channel} is only allowed for Patreon donators. However, you can still interact with me in <#804227071765118976>`
                )
        );
        return;
    }

    const cs = conversationIds.get(channel.id);
    const res = await axios.get(
        `http://www.cleverbot.com/getreply?key=${
            process.env.CLEVER_BOT_API_KEY
        }&input=${input}${cs ? `&cs=${cs}` : ''}`
    );
    conversationIds.set(channel.id, res.data.cs);
    await channel.send(res.data.output);
}
