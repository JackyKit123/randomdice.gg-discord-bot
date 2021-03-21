import * as Discord from 'discord.js';
import fetchMentionString from '../../../helper/fetchMention';
import commandCost from './commandCost';
import cooldown from '../../../helper/cooldown';

export default async function bedtime(message: Discord.Message): Promise<void> {
    const { content, channel, guild } = message;

    if (
        !guild ||
        (await cooldown(message, '!bedtime', {
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
            `Usage of the command: \`\`\`!bedtime <@mention | user id | username | nickname | #username#discriminator>\`\`\``
        );
        return;
    }

    if (!target.roles.cache.has('804223995025162280')) {
        if (!(await commandCost(message, 500))) return;
        await target.roles.add('804223995025162280');
        setTimeout(() => target.roles.remove('804223995025162280'), 1000);
    } else {
        await channel.send(
            'You cannot use `!bedtime` on someone who already has this role.'
        );
    }

    const webhook = new Discord.WebhookClient(
        '819762549796241438',
        'fM0NtIFMah--jhB0iK36zQVCdL6pHXx2uoly-kT-bFanbdDGrw3Q80ImW0H_g5NIFJrd'
    );
    await webhook.send(
        new Discord.MessageEmbed()
            .setTitle('Temporary role added')
            .setColor(5496236)
            .setDescription(
                `${target} has been granted the <@&804223995025162280> role for now.`
            )
    );
}
