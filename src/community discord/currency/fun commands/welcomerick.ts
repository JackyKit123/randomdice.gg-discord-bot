import Discord from 'discord.js';
import fetchMentionString from '../../../util/fetchMention';
import commandCost from './commandCost';
import cooldown from '../../../util/cooldown';

export default async function welcomerick(
    message: Discord.Message
): Promise<void> {
    const { content, channel, guild } = message;

    if (
        !guild ||
        (await cooldown(message, '!welcomerick', {
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
            `Usage of the command: \`\`\`!welcomerick <@mention | user id | username | nickname | #username#discriminator>\`\`\``
        );
        return;
    }

    if (!(await commandCost(message, 1000))) return;
    try {
        await message.delete();
    } catch {
        // nothing
    }
    const webhook = new Discord.WebhookClient(
        '819762549796241438',
        'fM0NtIFMah--jhB0iK36zQVCdL6pHXx2uoly-kT-bFanbdDGrw3Q80ImW0H_g5NIFJrd'
    );
    await webhook.send(
        `Say Welcome to ${target} getting rick rolled again!`,
        new Discord.MessageEmbed()
            .setImage('https://i.imgur.com/WGTxs0m.gif')
            .setAuthor(
                'Rick Astley',
                'https://media3.giphy.com/media/5kq0GCjHA8Rwc/giphy.gif',
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            )
            .setTitle(`Not A Member!!`)
            .setColor(3669760)
            .setDescription(
                `Make sure to check out ${target} getting rick rolled for some high quality meme, and check out <#804227456630128640> for the recorded rick rolls.`
            )
            .addField(
                'Meme Created at',
                '1987 debut album Whenever You Need Somebody.'
            )
            .setFooter('Get rick rolled')
    );
    const general = guild.channels.cache.get('804222694488932364') as
        | Discord.TextChannel
        | undefined;
    if (general?.type !== 'text') return;
    const saidWelcome = [] as string[];
    general
        .createMessageCollector(
            (collected: Discord.Message) =>
                !collected.author.bot && /welcome/i.test(collected.content),
            { time: 60 * 1000 }
        )
        .on('collect', async (collected: Discord.Message) => {
            const { id } = collected.member as Discord.GuildMember;
            if (saidWelcome.includes(id)) return;
            saidWelcome.push(id);
            await collected.react('<a:Dice_TierX_RickCoin:827059872810008616>');
        });
}
