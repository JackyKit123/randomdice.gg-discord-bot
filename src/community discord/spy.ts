import {
    ButtonInteraction,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
} from 'discord.js';
import channelIds from 'config/channelIds';
import { moderatorRoleIds } from 'config/roleId';
import { banHammer } from 'config/emojiId';
import {
    suppressUnknownMember,
    suppressUnknownMessage,
} from 'util/suppressErrors';
import { getCommunityDiscord, isHackDiscord } from 'config/guild';
import { ban } from './moderation';
import { writeModLog } from './moderation/modlog';

export default async function spy(message: Message): Promise<void> {
    const { guild, member, content, client, author, channel, attachments } =
        message;
    if (!member || !isHackDiscord(guild) || channel.type !== 'GUILD_TEXT')
        return;

    const communityDiscord = getCommunityDiscord(client);
    const spyLog = communityDiscord?.channels.cache.get(
        channelIds['hack-discord-spy-log']
    );
    if (!communityDiscord || !spyLog) return;
    const isBanned = communityDiscord.bans.cache.has(author.id);
    const isCommunityDiscordMember =
        !isBanned &&
        !!(await guild.members.fetch(author).catch(suppressUnknownMember));
    if (!spyLog?.isText()) return;
    const sensitiveWords =
        /\b(hack\w*)|(buy\w*)|(sell\w*)|(boost\w*)|(account\w*)|(price\w*)|(carry\w*)|(carried)|(c(?:lass)? ?15)|(\$)\b/gi;
    const triggered = Array.from(content.matchAll(sensitiveWords));
    const [sliced1, sliced2] = [content.slice(0, 1024), content.slice(1024)];
    let embed = new MessageEmbed()
        .setAuthor({
            name: author.tag,
            iconURL: author.displayAvatarURL({ dynamic: true }),
        })
        .setTitle('Hack Discord Spied Message')
        .addField('User', `${author}\nID: ${author.id}`)
        .addField('User has been banned', isBanned ? '✔️' : '❌');
    if (!isBanned) {
        embed = embed.addField(
            'User is member in this discord',
            isCommunityDiscordMember ? '✔️' : '❌'
        );
    }
    embed = embed
        .addField('In Channel', `#${channel.name}`)
        .setFooter({
            text: guild.name,
            iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
        })
        .setTimestamp();
    if (!isBanned) {
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
    await spyLog.send({
        content: triggered.length
            ? `${
                  isBanned
                      ? ''
                      : moderatorRoleIds.map(id => `<@&${id}>`).join(' ')
              } Sensitive keyword${
                  Array.from(triggered).length > 1 ? 's' : ''
              } triggered: ${Array.from(triggered)
                  .map(match => `**${match[0]}**`)
                  .join(' ')}`
            : undefined,
        embeds: [embed],
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setCustomId('spy-log-ban')
                    .setLabel('BAN')
                    .setStyle('DANGER')
                    .setEmoji(banHammer),
            ]),
        ],
    });
}

async function cleanUpMessage(message: Message, id: string): Promise<void> {
    const { embeds, author, client } = message;
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
        await message.edit({ embeds: [embed], components: [] });
    }
}

export async function spyLogBanHandler(
    interaction: ButtonInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { message, member } = interaction;
    const { channel, guild, embeds } = message;

    if (
        !member.permissions.has('BAN_MEMBERS') ||
        channel.id !== channelIds['hack-discord-spy-log'] ||
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
        'Random Dice Hack Discord related activity',
        member.user,
        'ban'
    );
    await ban(
        target.user,
        'Random Dice Hack Discord related activity',
        member,
        null
    ).catch(suppressUnknownMember);
    channel.messages.cache.forEach(m =>
        cleanUpMessage(m, id).catch(suppressUnknownMessage)
    );
}
