import * as Discord from 'discord.js';
import { promisify } from 'util';

const wait = promisify(setTimeout);

export default async function infoVC(client: Discord.Client): Promise<void> {
    const guild = await client.guilds.fetch('804222694488932362');
    const now = new Date();
    const hour = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const seconds = now.getUTCSeconds();

    let { memberCount } = guild;

    async function updateTime(): Promise<void> {
        const channel = guild.channels.cache.get('806611099775664218');
        if (!channel) {
            return;
        }
        const timeString = `${hour > 12 ? hour - 12 + 1 : hour + 1}:${
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

    updateTime();
    updateMember();
    await wait(60 - seconds);
    setInterval(updateTime, 1000 * 60);
    setInterval(updateMember, 1000 * 60);
}
