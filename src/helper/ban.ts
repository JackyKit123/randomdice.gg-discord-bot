import * as Discord from 'discord.js';

export default async function Banned(
    channel: Discord.TextChannel | Discord.NewsChannel | Discord.DMChannel
): Promise<boolean> {
    const bannedServers = ['717500464975052883'];

    if (channel.type !== 'dm' && bannedServers.includes(channel.guild.id)) {
        await channel.send(
            'This server can no longer running `.gg` commands, consider joining our brand new community server for better support!\n https://discord.gg/ZrXRpZq2mq'
        );
        return true;
    }
    return false;
}
