import {
    ApplicationCommandData,
    CommandInteraction,
    Message,
    MessageEmbed,
    WebhookClient,
} from 'discord.js';
import { promisify } from 'util';
import cooldown from 'util/cooldown';
import channelIds from 'config/channelIds';
import { rickCoin } from 'config/emojiId';
import roleIds from 'config/roleId';
import { suppressReactionBlocked } from 'util/suppressErrors';
import commandCost from './commandCost';

const wait = promisify(setTimeout);

export default async function welcomerick(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { options, guild } = interaction;

    if (
        await cooldown(interaction, {
            default: 60 * 1000,
            donator: 30 * 1000,
        })
    )
        return;

    const target = options.getMember('member', true);

    if (!(await commandCost(interaction, 1000))) return;

    const general = guild.channels.cache.get(channelIds.general);
    if (general?.type !== 'GUILD_TEXT' || !general.isText()) {
        await interaction.reply('I cannot find the general channel');
        return;
    }

    const webhook = new WebhookClient({
        id: '819762549796241438',
        token: 'fM0NtIFMah--jhB0iK36zQVCdL6pHXx2uoly-kT-bFanbdDGrw3Q80ImW0H_g5NIFJrd',
    });
    await webhook.send({
        content: `Say Welcome to ${target} getting rick rolled again!`,
        embeds: [
            new MessageEmbed()
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
    await interaction.reply({
        content: `Rick Astley is on the way to ${target} getting rick rolled again!`,
        ephemeral: true,
    });
    const saidWelcome: string[] = [];
    general
        .createMessageCollector({
            filter: (collected: Message) =>
                !collected.author.bot && /welcome/i.test(collected.content),
            time: 60 * 1000,
        })
        .on('collect', async (collected: Message) => {
            const id = collected.member?.id;
            if (!id || saidWelcome.includes(id)) return;
            saidWelcome.push(id);
            await collected.react(rickCoin).catch(suppressReactionBlocked);
            await collected.member.roles.add(roleIds.rick);
            await wait(1000 * 60 * 5);
            await collected.member.roles.remove(roleIds.rick);
        });
}

export const commandData: ApplicationCommandData = {
    name: 'welcomerick',
    description:
        'Send a fake welcome message to #general, Rick Astley just joined!',
    options: [
        {
            name: 'member',
            description: 'The member to be targeted for the rick roll',
            type: 'USER',
            required: true,
        },
    ],
};
