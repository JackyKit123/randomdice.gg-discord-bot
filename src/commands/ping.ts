import { CommandInteraction, Message, MessageEmbed } from 'discord.js';
import cooldown from 'util/cooldown';
import { reply, edit } from 'util/typesafeReply';

export default async function ping(
    input: Message | CommandInteraction
): Promise<void> {
    const timestamp = Date.now();

    if (
        await cooldown(input, '.gg ping', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    const sent = await reply(input, {
        embeds: [
            new MessageEmbed()
                .setTitle('Pong')
                .setDescription(`Time elapsed: ...ms`)
                .setColor('#6ba4a5')
                .setThumbnail(
                    'https://randomdice.gg/android-chrome-512x512.png'
                ),
        ],
    });
    await edit(input instanceof CommandInteraction ? input : sent, {
        embeds: [
            new MessageEmbed()
                .setTitle('Pong')
                .setDescription(`Time elapsed: ${Date.now() - timestamp}ms`)
                .setColor('#6ba4a5')
                .setThumbnail(
                    'https://randomdice.gg/android-chrome-512x512.png'
                ),
        ],
    });
}
