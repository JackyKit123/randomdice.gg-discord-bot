import Discord from 'discord.js';
import { promisify } from 'util';
import fetchMentionString from 'util/fetchMention';
import cooldown from 'util/cooldown';
import commandCost from './commandCost';
import channelIds from 'config/channelIds';
import { rickCoin } from 'config/emojiId';
import roleIds from 'config/roleId';

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
                .setAuthor({
                    name: 'Rick Astley',
                    iconURL:
                        'https://media3.giphy.com/media/5kq0GCjHA8Rwc/giphy.gif',
                    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                })
                .setTitle(`Not A Member!!`)
                .setColor(3669760)
                .setDescription(
                    `Make sure to check out ${target} getting rick rolled for some high quality meme, and check out <#${channelIds.memes}> for the recorded rick rolls.`
                )
                .addField(
                    'Meme Created at',
                    '1987 debut album Whenever You Need Somebody.'
                )
                .setFooter({ text: 'Get rick rolled' }),
        ],
    });
    const general = guild.channels.cache.get(channelIds.general);
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
            await collected.react(rickCoin);
            await collected.member.roles.add(roleIds.rick);
            await wait(1000 * 60 * 5);
            await collected.member.roles.remove(roleIds.rick);
        });
}
