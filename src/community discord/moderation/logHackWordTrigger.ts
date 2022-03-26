import {
    ButtonInteraction,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
} from 'discord.js';
import channelIds from 'config/channelIds';
import roleIds, { moderatorRoleIds } from 'config/roleId';
import { banHammer } from 'config/emojiId';
import {
    suppressUnknownBan,
    suppressUnknownMember,
    suppressUnknownMessage,
} from 'util/suppressErrors';
import { getCommunityDiscord, isHackDiscord } from 'config/guild';
import disableButtons from 'util/disabledButtons';
import { writeModLog } from './modlog';
import Reasons from './reasons.json';

export async function hackDiscussionLogging(
    message: Message<true>
): Promise<void> {
    const { guild, content, client, author, channel, attachments } = message;

    const communityDiscord = getCommunityDiscord(client);
    const hackLog = communityDiscord?.channels.cache.get(
        channelIds['hack-discussion-log']
    );
    if (
        !communityDiscord ||
        !hackLog ||
        channel === hackLog ||
        communityDiscord.members.cache
            .get(author.id)
            ?.roles.cache.hasAny(roleIds.Admin, ...moderatorRoleIds)
    )
        return;
    const isBanned = !!(await communityDiscord.bans
        .fetch(author)
        .catch(suppressUnknownBan));
    const isCommunityDiscordMember =
        !isBanned &&
        !!(await guild.members.fetch(author).catch(suppressUnknownMember));
    if (!hackLog?.isText()) return;
    const sensitiveWords = isHackDiscord(guild)
        ? /\b(hack\w*)\b|\b(buy\w*)\b|\b(sell\w*)\b|\b(boost\w*)\b|\b(account\w*)\b|\b(price\w*)\b|\b(carry\w*)\b|\b(carried)\b|\b(c(?:lass)? ?15)\b/gi
        : /\b(hack\w*)\b|\b(boost\w*)\b|\b(account\w*)\b|\b(price\w*)\b|\b(c(?:lass)? ?15)\b/gi;
    const triggered = Array.from(content.matchAll(sensitiveWords));
    if (!triggered.length && !isHackDiscord(guild)) return;
    const [sliced1, sliced2] = [content.slice(0, 1024), content.slice(1024)];
    let embed = new MessageEmbed()
        .setAuthor({
            name: author.tag,
            iconURL: author.displayAvatarURL({ dynamic: true }),
        })
        .setTitle('Hack Discussion Logging')
        .addField('Message Link', message.url)
        .addField('User', `${author}\nID: ${author.id}`)
        .addField('User has been banned', isBanned ? '✔️' : '❌');
    if (!isBanned) {
        embed = embed.addField(
            'User is member in this discord',
            isCommunityDiscordMember ? '✔️' : '❌'
        );
        if (triggered.length) {
            if (isCommunityDiscordMember) {
                embed = embed.setColor('#ff0000');
            } else {
                embed = embed.setColor('#ffff00');
            }
        } else if (isCommunityDiscordMember) {
            embed = embed.setColor('#ffff00');
        } else {
            embed = embed.setColor('#00ff00');
        }
    }
    embed = embed
        .addField('In Channel', `#${channel.name}`)
        .setFooter({
            text: guild.name,
            iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
        })
        .setTimestamp();
    if (sliced1) {
        embed = embed.addField('Content', sliced1);
        if (sliced2) {
            embed = embed.addField('‎', sliced2);
        }
    }
    if (attachments.size) {
        embed = embed.addField(
            `Attachment${attachments.size > 1 ? 's' : ''}`,
            attachments.map(attachment => attachment.url).join('\n')
        );
    }
    await hackLog.send({
        content:
            (triggered.length &&
                isHackDiscord(guild) &&
                `${
                    isBanned
                        ? ''
                        : moderatorRoleIds.map(id => `<@&${id}>`).join(' ')
                } Sensitive keyword${
                    Array.from(triggered).length > 1 ? 's' : ''
                } triggered: ${Array.from(triggered)
                    .map(match => `**${match[0]}**`)
                    .join(' ')}`) ||
            undefined,
        embeds: [embed],
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setCustomId('hack-log-ban')
                    .setLabel('BAN')
                    .setStyle('DANGER')
                    .setEmoji(banHammer),
            ]),
        ],
    });
}

async function cleanUpMessage(message: Message, id: string): Promise<void> {
    const { embeds, author, client, components } = message;
    if (!embeds[0] || !client.user || author.id !== client.user.id) return;
    const embed = embeds[0];
    const { fields } = embed;
    const memberBannedDisplayed = fields.some(
        ({ name, value }) => name === 'User has been banned' && value === '✔️'
    );
    if (
        fields[0]?.name !== 'User' ||
        id !== fields[0]?.value?.match(/ID: (\d{18})$/m)?.[1]
    )
        return;

    if (!memberBannedDisplayed) {
        embed.fields = fields.filter(
            field => field.name !== 'User is member in this discord'
        );
        embed.color = 0;
        embed.fields[1].value = '✔️';
        await message.edit(disableButtons({ embeds: [embed], components }));
    }
}

export async function hackLogBanHandler(
    interaction: ButtonInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { message, member } = interaction;
    const { channel, guild, embeds } = message;

    if (
        !member.permissions.has('BAN_MEMBERS') ||
        channel.id !== channelIds['hack-discussion-log'] ||
        !embeds[0]
    )
        return;

    const { fields } = embeds[0];
    if (fields[0]?.name !== 'User') return;
    const id = fields[0]?.value?.match(/ID: (\d{18})$/m)?.[1];
    if (!id) return;
    const banned = await guild.bans.fetch();
    if (banned.some(({ user: u }) => u.id === id)) return;

    const target = await guild.members.fetch(id);
    await writeModLog(
        target.user,
        Reasons['Member in Hack Servers'],
        member.user,
        'ban'
    );
    await target.send(Reasons['Member in Hack Servers']);
    await guild.members
        .ban(target.user, {
            reason: `Banned by ${member.user.tag} Reason: ${Reasons['Member in Hack Servers']}`,
        })
        .catch(suppressUnknownMember);
    channel.messages.cache.forEach(m =>
        cleanUpMessage(m, id).catch(suppressUnknownMessage)
    );
}
