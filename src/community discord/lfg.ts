import channelIds from 'config/channelIds';
import roleIds, { tier2RoleIds } from 'config/roleId';
import {
    ApplicationCommandData,
    ButtonInteraction,
    CommandInteraction,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
} from 'discord.js';
import cooldown from 'util/cooldown';
import getMessageLink from 'util/getMessageLink';
import checkPermission from './util/checkPermissions';

export default async function lfg(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, channel, options } = interaction;

    const msg = options.getString('message');
    const preference = options.getString('preference') ?? 'both';

    if (!channel) return;

    if (
        await cooldown(interaction, {
            default: 600 * 1000,
            donator: 600 * 1000,
        })
    ) {
        return;
    }

    if (!(await checkPermission(interaction, ...tier2RoleIds))) return;

    if (
        channel.id !== channelIds['jackykit-playground-v3'] &&
        channel.id !== channelIds['jackykit-playground-v2'] &&
        channel.id !== channelIds['look-for-games']
    ) {
        await interaction.reply(
            `You can only use this command in <#${channelIds['look-for-games']}>.`
        );
        return;
    }

    if (msg && msg.length > 1024) {
        await interaction.reply(
            'Your message cannot be longer than 1024 characters.'
        );
        return;
    }

    let embed = new MessageEmbed()
        .setAuthor({
            name: member.user.tag,
        })
        .setTitle('Looking for Game!')
        .setThumbnail(member.displayAvatarURL({ dynamic: true }))
        .setColor(member.displayHexColor)
        .setDescription(`${member} is looking for a Random Dice partner!`);

    if (msg) {
        embed = embed.addField('Message', msg);
    }

    await interaction.deferReply();

    const pingButton = new MessageButton()
        .setCustomId('ping-lfg')
        .setStyle('PRIMARY')
        .setLabel(`Click Here to ping ${member.displayName}!`);

    const dmButton = new MessageButton()
        .setStyle('LINK')
        .setLabel(`Click Here to DM ${member.displayName}!`)
        .setURL(getMessageLink(member));

    let buttons = new MessageActionRow();
    switch (preference) {
        case 'ping':
            buttons = buttons.addComponents(pingButton);
            break;
        case 'dm':
            buttons = buttons.addComponents(dmButton);
            break;
        case 'both':
            buttons = buttons.addComponents(pingButton, dmButton);
            break;
        default:
    }

    await channel.send({
        content: `<@&${roleIds['Looking for Games Ping']}>`,
        embeds: [embed],
        components: [buttons],
    });

    await interaction.deleteReply();
}

export async function pingLfg(interaction: ButtonInteraction): Promise<void> {
    if (
        await cooldown(
            interaction,
            {
                default: 600 * 1000,
                donator: 600 * 1000,
            },
            `ping-lfg-${interaction.message.author.id}`
        )
    ) {
        return;
    }
    if (interaction.user.id === interaction.message.author.id) {
        await interaction.reply({
            content: 'You cannot ping yourself',
            ephemeral: true,
        });
    }
    if (!interaction.inCachedGuild()) return;
    const {
        guild,
        message: {
            embeds: [embed],
        },
    } = interaction;

    const user = guild.members.cache.get(
        embed.description?.match(/^<@!?(\d{18})>/)?.[1] ?? ''
    );
    if (!user) {
        await interaction.reply(
            'This button is too old, please initiate a new command'
        );
        return;
    }
    await interaction.reply({
        content: `${user}, ${interaction.user} wants to play with you!`,
        allowedMentions: {
            users: [user.id],
        },
    });
}

export const commandData: ApplicationCommandData = {
    name: 'lfg',
    description: 'Ping @Looking for game in #looking-for-game',
    options: [
        {
            name: 'message',
            description: 'Message to send with the ping',
            type: 3,
        },
        {
            name: 'preference',
            description: 'Ping or DM',
            type: 'STRING',
            choices: [
                {
                    name: 'Both',
                    value: 'both',
                },
                {
                    name: 'Preferred to be pinged',
                    value: 'ping',
                },
                {
                    name: 'Preferred to be DM',
                    value: 'dm',
                },
            ],
        },
    ],
};
