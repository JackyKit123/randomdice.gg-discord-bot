import { appealServerChannelId } from 'config/channelIds';
import { getCommunityDiscord } from 'config/guild';
import { communityDiscordInvitePermaLink } from 'config/url';
import {
    ApplicationCommandData,
    ButtonInteraction,
    CategoryChannel,
    Collection,
    CommandInteraction,
    GuildMember,
    MessageEmbed,
    NewsChannel,
    PartialGuildMember,
    TextChannel,
    User,
    UserContextMenuInteraction,
} from 'discord.js';
import { suppressCannotDmUser, suppressUnknownBan } from 'util/suppressErrors';
import { writeModLog } from '../modlog';

export async function archiveAppeal(
    channel: NewsChannel | TextChannel
): Promise<void> {
    if (!channel) return;
    const { guild } = channel;
    const archiveCategories = guild.channels.cache.filter(
        chl =>
            /archives/i.test(chl.name) &&
            chl instanceof CategoryChannel &&
            chl.children.size < 50
    ) as Collection<string, CategoryChannel>;
    const archiveCategory =
        archiveCategories.last() ??
        (await guild.channels.create('Archives', {
            type: 'GUILD_CATEGORY',
            position: -1,
        }));

    if (channel?.type === 'GUILD_TEXT')
        await channel.setParent(archiveCategory);
}

const closeAppealLog = async (
    target: GuildMember | PartialGuildMember,
    moderator: User,
    action: 'accept' | 'reject' | 'falsebanned',
    closeAppealReason: string | null
) => {
    const { guild, client } = target;

    const logChannel = guild.channels.cache.get(appealServerChannelId.log);

    const existingAppealLog = logChannel?.isText()
        ? (await logChannel.messages.fetch({ limit: 100 })).find(
              ({ author, embeds }) => {
                  if (author.id !== client.user?.id) return false;
                  const [embed] = embeds;
                  if (!embed) return false;
                  const { title, fields } = embed;
                  if (title !== 'Ban Appeal Created') return false;
                  if (fields[1].value !== target.toString().replace('!', ''))
                      return false;
                  return true;
              }
          )
        : undefined;

    let logEmbed = (
        existingAppealLog?.embeds[0] ||
        new MessageEmbed().setAuthor({
            name: target.user.tag,
            iconURL: target.displayAvatarURL({ dynamic: true }),
        })
    )
        .setTimestamp()
        .setFooter({ text: 'Case closed: ' })
        .addField(
            'Appeal closed by',
            `${moderator.username}\n${moderator}`,
            true
        );

    if (closeAppealReason) {
        logEmbed = logEmbed.addField('Case close reason', closeAppealReason);
    }

    switch (action) {
        case 'accept':
            logEmbed = logEmbed.setTitle('Appeal accepted').setColor('#e5ffe5');
            break;
        case 'reject':
            logEmbed = logEmbed.setTitle('Appeal rejected').setColor('#ff3434');
            break;
        case 'falsebanned':
            logEmbed = logEmbed
                .setTitle('Member is not guilty')
                .setColor('#e5ffe5');
            break;
        default:
    }

    if (existingAppealLog) {
        await existingAppealLog.edit({ embeds: [logEmbed] });
    } else if (logChannel?.isText()) {
        await logChannel.send({ embeds: [logEmbed] });
    }

    return logEmbed;
};

export const accept = async (
    target: GuildMember,
    moderator: User,
    reason: string | null
): Promise<MessageEmbed> => {
    const communityDiscord = getCommunityDiscord(target.client);

    const acceptReason = `Appealed accepted in appeal server. ${
        reason ?? ''
    }`.trim();
    await communityDiscord.members
        .unban(target, acceptReason)
        .catch(suppressUnknownBan);

    await writeModLog(target.user, acceptReason, moderator, 'unban');

    await target
        .send(
            `Your appeal is accepted.\n${
                reason ? `Reason: ${reason}\n` : ''
            }You may now return to this main server. ${communityDiscordInvitePermaLink}`
        )
        .catch(suppressCannotDmUser);
    await target.ban({
        reason: `Appeal accepted.\n${reason || ''}`.trim(),
    });

    return closeAppealLog(target, moderator, 'accept', reason);
};

export const reject = async (
    target: GuildMember | PartialGuildMember,
    moderator: User,
    reason: string | null
): Promise<MessageEmbed> => {
    await target
        .send(`Your appeal is rejected.${reason ? `\nReason: ${reason}` : ''}`)
        .catch(suppressCannotDmUser);
    await target.ban({
        reason: `Appeal rejected.\n${reason || ''}`.trim(),
    });
    return closeAppealLog(target, moderator, 'reject', reason);
};

export const falsebanned = async (
    target: GuildMember,
    moderator: User,
    reason: string | null
): Promise<MessageEmbed> => {
    const { client } = target;
    const communityDiscord = getCommunityDiscord(client);

    const falsebannedReason =
        `Appealed accepted in appeal server, member is not guilty. ${
            reason ?? ''
        }`.trim();
    await communityDiscord.members.unban(target, falsebannedReason);
    await writeModLog(target.user, falsebannedReason, moderator, 'unban');
    await target
        .send(
            `Your appeal is accepted, you are found to be clean, you may now return to this main server. ${communityDiscordInvitePermaLink}`
        )
        .catch(suppressCannotDmUser);

    await target.kick(
        `Member is not guilty, appeal closed. ${reason ?? ''}`.trim()
    );
    return closeAppealLog(target, moderator, 'falsebanned', reason);
};

export default async function closeAppeal(
    interaction:
        | CommandInteraction
        | ButtonInteraction
        | UserContextMenuInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, guild, channel } = interaction;

    if (!channel || !channel.isText() || channel.isThread()) return;

    const membersInAppealRoom = channel.permissionOverwrites.cache.filter(
        overwrite => overwrite.type === 'member'
    );

    const target =
        (interaction instanceof CommandInteraction
            ? interaction.options.getMember('member')
            : null) ||
        (membersInAppealRoom.size === 1
            ? await guild.members.fetch(membersInAppealRoom.first()?.id ?? '')
            : null);

    const reason =
        (interaction instanceof CommandInteraction &&
            interaction.options.getString('reason')) ||
        null;

    if (!target) {
        await interaction.reply({
            content: 'Please provide a valid member to close the appeal.',
            ephemeral: interaction instanceof ButtonInteraction,
        });
        return;
    }

    if (target.id === member.id) {
        await interaction.reply({
            content: 'You cannot close your own appeal.',
            ephemeral: interaction instanceof ButtonInteraction,
        });
        return;
    }

    if (!member.permissions.has('BAN_MEMBERS')) {
        await interaction.reply({
            content:
                'You do not have sufficient permission to execute this command.',
            ephemeral: interaction instanceof ButtonInteraction,
        });
        return;
    }

    const executorRole = member.roles.highest;
    const targetRole = target.roles.highest;

    if (executorRole.comparePositionTo(targetRole) < 0) {
        await interaction.reply(
            'You do not have sufficient permission to ban or unban this user.'
        );
        return;
    }

    let closeResponse;

    switch (
        interaction instanceof ButtonInteraction
            ? interaction.customId
            : interaction.commandName
    ) {
        case 'accept':
        case 'appeal-accept':
        case 'Accept Appeal':
            closeResponse = await accept(target, member.user, reason);
            break;
        case 'reject':
        case 'appeal-reject':
        case 'Reject Appeal':
            closeResponse = await reject(target, member.user, reason);
            break;
        case 'falsebanned':
        case 'appeal-falsebanned':
        case 'Not Guilty':
            closeResponse = await falsebanned(target, member.user, reason);
            break;
        default:
    }
    if (closeResponse) await interaction.reply({ embeds: [closeResponse] });
    await archiveAppeal(channel);
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'accept',
        description: 'Accepts the appeal.',
        options: [
            {
                name: 'member',
                description: 'The member to accept the appeal for.',
                type: 'USER',
            },
            {
                name: 'reason',
                description: 'The reason for accepting the appeal.',
                type: 'STRING',
            },
        ],
    },
    {
        name: 'reject',
        description: 'Rejects the appeal.',
        options: [
            {
                name: 'member',
                description: 'The member to reject the appeal for.',
                type: 'USER',
            },
            {
                name: 'reason',
                description: 'The reason for accepting the appeal.',
                type: 'STRING',
            },
        ],
    },
    {
        name: 'falsebanned',
        description: 'Closes the appeal as false banned.',
        options: [
            {
                name: 'member',
                description: 'The member to close the appeal for.',
                type: 'USER',
            },
            {
                name: 'reason',
                description: 'The reason for accepting the appeal.',
                type: 'STRING',
            },
        ],
    },
    {
        name: 'Accept Appeal',
        type: 'USER',
    },
    {
        name: 'Reject Appeal',
        type: 'USER',
    },
    {
        name: 'Not Guilty',
        type: 'USER',
    },
];
