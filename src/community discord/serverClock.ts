import channelIds from 'config/channelIds';
import { Client } from 'discord.js';
import moment from 'moment';
import { promisify } from 'util';

const wait = promisify(setTimeout);

export default async function serverClock(client: Client<true>): Promise<void> {
    async function updateTime(): Promise<void> {
        const channel = client.channels.cache.get(channelIds['Server Clock']);
        if (!channel?.isVoice()) return;

        await channel.setName(
            `🕒 UTC ${moment().format('LT')}`,
            'update utc time'
        );

        await wait(1000 * 60 * 5);

        await updateTime();
    }

    await updateTime();
}
