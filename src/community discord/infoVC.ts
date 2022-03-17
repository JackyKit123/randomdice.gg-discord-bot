import channelIds from 'config/channelIds';
import { getCommunityDiscord } from 'config/guild';
import Discord from 'discord.js';
import { promisify } from 'util';

const wait = promisify(setTimeout);

export default async function infoVC(client: Discord.Client): Promise<void> {
    const guild = getCommunityDiscord(client);

    async function updateTime(): Promise<void> {
        const channel = guild?.channels.cache.get(channelIds['Server Clock']);
        if (!channel) return;

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

    await wait((59 - new Date().getUTCSeconds()) * 1000);
    await updateTime();
    setInterval(async () => updateTime(), 1000 * 60 * 5);
}
