import Discord from 'discord.js';
import { promisify } from 'util';
import fetchMentionString from '../../../util/fetchMention';
import commandCost from './commandCost';
import cooldown from '../../../util/cooldown';

const wait = promisify(setTimeout);

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
    const webhook = new Discord.WebhookClient({
        id: '819762549796241438',
        token: 'fM0NtIFMah--jhB0iK36zQVCdL6pHXx2uoly-kT-bFanbdDGrw3Q80ImW0H_g5NIFJrd',
    });
    await webhook.send({
        content: `Say Welcome to ${target} getting rick rolled again!`,
        embeds: [
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
                .setFooter('Get rick rolled'),
        ],
    });
    const general = guild.channels.cache.get('804222694488932364');
    if (general?.type !== 'GUILD_TEXT' || !general.isText()) return;
    const saidWelcome: string[] = [];
    general
        .createMessageCollector({
            filter: (collected: Discord.Message) =>
                !collected.author.bot && /welcome/i.test(collected.content),
            time: 60 * 1000,
        })
        .on('collect', async (collected: Discord.Message) => {
            const id = collected.member?.id;
            if (!id || saidWelcome.includes(id)) return;
            saidWelcome.push(id);
            await collected.react('<a:Dice_TierX_RickCoin:827059872810008616>');
            await collected.member.roles.add('892634239290445824');
            await wait(5000);
            await collected.member.roles.remove('892634239290445824');
        });
}
