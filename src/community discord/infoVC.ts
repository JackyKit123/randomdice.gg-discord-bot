import * as Discord from 'discord.js';

export default async function infoVC(client: Discord.Client): Promise<void> {
    const guild = await client.guilds.fetch('804222694488932362');
    const now = new Date();
    const hour = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    let { memberCount } = guild;

    async function updateTime(): Promise<void> {
        const channel = guild.channels.cache.get('806611099775664218');
        if (!channel) {
            return;
        }
        const timeString = `${String(hour).length === 1 ? `0${hour}` : hour}:${
            String(minutes).length === 1 ? `0${minutes}` : minutes
        }${hour >= 12 ? 'PM' : 'AM'}`;
        try {
            await channel.setName(`🕒 UTC ${timeString}`);
        } catch {
            //
        }
    }

    async function updateMember(): Promise<void> {
        const channel = guild.channels.cache.get('804370301818765322');
        if (!channel) {
            return;
        }
        if (memberCount === guild.memberCount) {
            return;
        }
        try {
            memberCount = guild.memberCount;
            await channel.setName(`Members: ${guild.memberCount}`);
        } catch {
            //
        }
    }

    setInterval(updateTime, 1000 * 60);
    setInterval(updateMember, 1000 * 60);
}
