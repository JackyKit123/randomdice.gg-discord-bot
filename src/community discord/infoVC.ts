import * as Discord from 'discord.js';
import { promisify } from 'util';

const wait = promisify(setTimeout);

export default async function infoVC(client: Discord.Client): Promise<void> {
    const guild = await client.guilds.fetch('804222694488932362');
    let memberCount = 0;

    async function updateTime(): Promise<void> {
        const channel = guild.channels.cache.get('806658300220407819');
        if (!channel) {
            return;
        }
        const now = new Date();
        const hour = now.getUTCHours();
        const minutes = now.getUTCMinutes();
        // eslint-disable-next-line no-nested-ternary
        const timeString = `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:${
            String(minutes).length === 1 ? `0${minutes}` : minutes
        }${hour >= 12 ? 'PM' : 'AM'}`;
        try {
            await channel.setName(`🕒 UTC ${timeString}`);
        } catch (err) {
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
    const now = new Date();
    const seconds = now.getUTCSeconds();
    await wait(1000 * 60 - seconds);
    setInterval(updateTime, 1000 * 60 * 5);
    setInterval(updateMember, 1000 * 60 * 5);
}
