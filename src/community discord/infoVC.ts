import * as Discord from 'discord.js';
import { promisify } from 'util';

const wait = promisify(setTimeout);

export default async function infoVC(client: Discord.Client): Promise<void> {
    let guild = await client.guilds.fetch('804222694488932362');

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
            await channel.setName(`🕒 UTC ${timeString}`, 'update utc time');
        } catch (err) {
            //
        }
    }

    async function updateMember(): Promise<void> {
        guild = await guild.fetch();
        const channel = guild.channels.cache.get('804370301818765322');
        if (!channel) {
            return;
        }
        try {
            await channel.setName(
                `Members: ${guild.memberCount}`,
                'update member count'
            );
        } catch {
            //
        }
    }

    await Promise.all([
        updateTime(),
        updateMember(),
        wait((59 - new Date().getUTCSeconds()) * 1000),
    ]);
    setInterval(async () => {
        await Promise.all([updateTime(), updateMember()]);
    }, 1000 * 60 * 5);
}
