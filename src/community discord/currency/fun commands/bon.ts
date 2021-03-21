import * as Discord from 'discord.js';
import fetchMentionString from '../../../helper/fetchMention';
import commandCost from './commandCost';
import cooldown from '../../../helper/cooldown';

export default async function bon(message: Discord.Message): Promise<void> {
    const { content, channel, guild, author } = message;

    if (
        !guild ||
        (await cooldown(message, '!bon', {
            default: 60 * 1000,
            donator: 30 * 1000,
        }))
    )
        return;

    const memberArg = content.split(' ')[1];
    const target = await fetchMentionString(memberArg, guild, {
        content,
        mentionIndex: 1,
    });

    if (!target) {
        await channel.send(
            `Usage of the command: \`\`\`!bon <@mention | user id | username | nickname | #username#discriminator>\`\`\``
        );
        return;
    }

    if (!commandCost(message, 100)) return;
    const webhook = new Discord.WebhookClient(
        '819762549796241438',
        'fM0NtIFMah--jhB0iK36zQVCdL6pHXx2uoly-kT-bFanbdDGrw3Q80ImW0H_g5NIFJrd'
    );
    await channel.send(`Goodbye ${target}, get fucking bonned!`);
    await webhook.send(
        new Discord.MessageEmbed()
            .setImage(
                'https://media1.tenor.com/images/7a9fe7f23548941c33b2ef1609c3d31c/tenor.gif?itemid=10045949'
            )
            .setThumbnail(
                'https://cdn.discordapp.com/avatars/195174308052467712/abd94867c0d5f3fd0d6c50514179a922.webp?size=1024'
            )
            .setTitle(
                `${target.user.username}#${target.user.discriminator} Got bonned`
            )
            .setColor('#ff0000')
            .setDescription(
                `Interested in why ${target} got bonned?||${target} got bonned by ${author}||`
            )
    );
}
