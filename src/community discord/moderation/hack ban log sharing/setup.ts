import getBrandingEmbed from 'commands/util/getBrandingEmbed';
import { CommandInteraction } from 'discord.js';
import checkSendMessagePermission from 'util/checkSendMessagePermission';
import { getRegisteredChannels, setChannelRegistry } from '.';

export async function participateInHackBadLogSharing(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    const {
        guild,
        options,
        member,
        client: { user: clientUser },
    } = interaction;
    if (!clientUser) return;

    if (guild.memberCount < 200) {
        await interaction.reply(
            'Your server must have at least 200 members to participate in the hackban system.'
        );
        return;
    }

    if (!member.permissions.has('MANAGE_GUILD')) {
        await interaction.reply(
            'You lack permission to execute this command, required permission: `MANAGE_GUILD`'
        );
        return;
    }

    const channel = options.getChannel('log-channel', true);
    if (!channel.isText()) {
        await interaction.reply(
            'You must provide a text channel for the log channel'
        );
        return;
    }
    if (!checkSendMessagePermission(channel)) {
        await interaction.reply(
            'I lack permission to that channel, please give me permission to view channel and send messages in that channel and try again.'
        );
        return;
    }
    if (!guild.me?.permissions.has('VIEW_AUDIT_LOG')) {
        await interaction.reply(
            'I lack permission to view the audit log, please give me permission to view audit log and try again.'
        );
        return;
    }

    await setChannelRegistry(guild.id, channel.id);

    await interaction.reply(
        `Your server has successfully joined the hack log sharing, the hack log will be posted in ${channel}\nBy participating in the hack log, your server ban action will be shared with other participated servers if the keyword "hack" exist in the ban reason. If you wish to exit this, do \`/hackban-log unparticipate\``
    );
}

export async function unparticipateInHackBadLogSharing(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    const {
        guild,
        member,
        client: { user: clientUser },
    } = interaction;
    if (!clientUser) return;

    if (!member.permissions.has('MANAGE_GUILD')) {
        await interaction.reply(
            'You lack permission to execute this command, required permission: `MANAGE_GUILD`'
        );
        return;
    }

    await setChannelRegistry(guild.id, null);

    await interaction.reply(
        'Your server has successfully left the hack log sharing.'
    );
}

export async function viewHackBanLogParticipatedServers(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
    const { client } = interaction;

    const participants = await getRegisteredChannels(client);
    await interaction.reply({
        embeds: [
            getBrandingEmbed()
                .setTitle('Hack Ban Log Participated Servers')
                .setDescription(
                    [...participants.keys()]
                        .sort(({ memberCount: a, memberCount: b }) => b - a)
                        .map(
                            ({ name, memberCount, ownerId }) =>
                                `**${name}**\n${memberCount} members - Owned by <@${ownerId}>`
                        )
                        .join('\n')
                ),
        ],
    });
}
