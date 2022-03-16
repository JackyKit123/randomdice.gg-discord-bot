import { appealServerChannelId } from 'config/channelIds';
import {
    ApplicationCommandData,
    ButtonInteraction,
    CategoryChannel,
    Collection,
    CommandInteraction,
    Guild,
    GuildBasedChannel,
    MessageEmbed,
    UserContextMenuInteraction,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { suppressCannotDmUser } from 'util/suppressErrors';
import { writeModLog } from '../modlog';

export async function archiveAppeal(
    guild: Guild,
    channel: GuildBasedChannel | null
): Promise<void> {
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

export default async function closeAppeal(
    interaction:
        | CommandInteraction
        | ButtonInteraction
        | UserContextMenuInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { client, member, guild, channel } = interaction;

    const { COMMUNITY_SERVER_ID } = process.env;

    if (!COMMUNITY_SERVER_ID) {
        throw new Error('Missing `COMMUNITY_SERVER_ID` env in bot code.');
    }

    const communityDiscord = client.guilds.cache.get(COMMUNITY_SERVER_ID);

    if (!communityDiscord) {
        throw new Error('Community Discord server is not located.');
    }

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
        interaction instanceof CommandInteraction &&
        interaction.options.getString('reason');
    const logChannel = guild.channels.cache.get(appealServerChannelId.log);

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
            `${member.displayName}\n${member.toString()}`,
            true
        );

    if (reason) {
        logEmbed = logEmbed.addField('Case close reason', reason);
    }

    const respondOnAppealClose = async (embed: MessageEmbed) => {
        await interaction.reply({ embeds: [embed] });
        if (existingAppealLog) {
            await existingAppealLog.edit({ embeds: [embed] });
        } else if (logChannel?.isText()) {
            await logChannel.send({ embeds: [embed] });
        }
    };

    const accept = async (): Promise<void> => {
        const acceptReason = `Appealed accepted in appeal server. ${
            reason ?? ''
        }`.trim();
        await communityDiscord.members.unban(target, acceptReason);
        await target
            .send(
                `Your appeal is accepted.\n${
                    reason ? `Reason: ${reason}\n` : ''
                }You may now return to this main server. https://discord.gg/ZrXRpZq2mq`
            )
            .catch(suppressCannotDmUser);

        await guild.members.ban(target, {
            reason: `Appeal accepted.\n${reason || ''}`.trim(),
        });
        await writeModLog(target.user, acceptReason, member.user, 'unban');
        await respondOnAppealClose(
            logEmbed.setTitle('Appeal accepted').setColor('#e5ffe5')
        );
    };

    const reject = async (): Promise<void> => {
        await target
            .send(
                `Your appeal is rejected.${reason ? `\nReason: ${reason}` : ''}`
            )
            .catch(suppressCannotDmUser);

        await guild.members.ban(target, {
            reason: `Appeal rejected.\n${reason || ''}`.trim(),
        });
        await respondOnAppealClose(
            logEmbed.setTitle('Appeal rejected').setColor('#ff3434')
        );
    };

    const falsebanned = async (): Promise<void> => {
        const falsebannedReason =
            `Appealed accepted in appeal server, member is not guilty. ${
                reason ?? ''
            }`.trim();
        await communityDiscord.members.unban(target, falsebannedReason);
        await writeModLog(target.user, falsebannedReason, member.user, 'unban');
        await target
            .send(
                'Your appeal is accepted, you are found to be clean, you may now return to this main server. https://discord.gg/ZrXRpZq2mq'
            )
            .catch(suppressCannotDmUser);

        await guild.members.kick(
            target,
            `Member is not guilty, appeal closed. ${reason ?? ''}`.trim()
        );
        await respondOnAppealClose(
            logEmbed.setTitle('Member is not guilty').setColor('#e5ffe5')
        );
    };

    const executorRole = member.roles.highest;
    const targetRole = target.roles.highest;

    if (executorRole.comparePositionTo(targetRole) < 0) {
        await interaction.reply(
            'You do not have sufficient permission to ban or unban this user.'
        );
        return;
    }

    if (
        await cooldown(interaction, 'close appeal', {
            default: 60 * 1000,
            donator: 60 * 1000,
        })
    ) {
        return;
    }

    await archiveAppeal(guild, channel);

    switch (
        interaction instanceof ButtonInteraction
            ? interaction.customId
            : interaction.commandName
    ) {
        case 'accept':
        case 'appeal-accept':
        case 'Accept Appeal':
            await accept();
            break;
        case 'reject':
        case 'appeal-reject':
        case 'Reject Appeal':
            await reject();
            break;
        case 'falsebanned':
        case 'appeal-falsebanned':
        case 'Not Guilty':
            await falsebanned();
            break;
        default:
    }
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
