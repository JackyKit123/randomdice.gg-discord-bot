import channelIds from 'config/channelIds';
import {
    CategoryChannel,
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
} from 'discord.js';
import cache from 'util/cache';
import cooldown from 'util/cooldown';

export default async function apply(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    const position = interaction.options.getString('position', true);

    const { guild, member } = interaction;

    if (
        await cooldown(interaction, {
            default: 1000 * 60 * 10,
            donator: 1000 * 60 * 10,
        })
    ) {
        return;
    }

    const applications = cache['discord_bot/community/applications'];
    const openedApplications = applications.filter(app => app.isOpen);
    const openedApplicationsEmbed = new MessageEmbed()
        .setTitle('Command Parse Error')
        .setColor('#ff0000')
        .addField(
            'Opened Applications',
            openedApplications.map(app => `\`${app.position}\``).join('\n') ||
                '*none*'
        )
        .setFooter({
            text: `Opened Application Count: ${openedApplications.length}`,
        });

    const application = applications.find(
        app =>
            position.toLowerCase() === app.position.toLowerCase() && app.isOpen
    );

    if (!application) {
        await interaction.reply({
            embeds: [
                openedApplicationsEmbed.setDescription(
                    `\`${position}\` is not a currently opened application.`
                ),
            ],
        });
        return;
    }

    const applicationCategory = guild.channels.cache.get(
        channelIds['💼 | Applications']
    );
    const newChannel = await guild.channels.create(
        `${member.user.username}-${member.user.discriminator}-${application.position}-application`,
        {
            type: 'GUILD_TEXT',
            parent:
                applicationCategory instanceof CategoryChannel
                    ? applicationCategory
                    : undefined,
            reason: 'Member Application',
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: member,
                    allow: ['VIEW_CHANNEL'],
                },
            ],
        }
    );

    await newChannel.send({
        content: member.toString(),
        embeds: [
            new MessageEmbed()
                .setTitle(`${application.position} Application`)
                .setColor(member.displayHexColor)
                .setAuthor({
                    name: member.user.tag,
                    iconURL: member.displayAvatarURL({ dynamic: true }),
                })
                .setFooter({
                    text: 'Click ✅ when finished, and ❌ to cancel your application.',
                })
                .setTimestamp()
                .addFields(
                    application.questions.map((question, i) => ({
                        name: `Question ${i + 1}`,
                        value: question,
                    }))
                ),
        ],
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setCustomId('application-submit')
                    .setEmoji('✅')
                    .setLabel('Submit')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId('application-cancel')
                    .setEmoji('❌')
                    .setLabel('Cancel')
                    .setStyle('DANGER'),
            ]),
        ],
    });

    await interaction.reply(
        `Your application channel has been created ${newChannel}`
    );
}
