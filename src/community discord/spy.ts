import * as Discord from 'discord.js';
import channelIds from 'config/channelIds';
import { moderatorRoleIds } from 'config/roleId';
import { banHammer } from 'config/emojiId';

const bannedCache: string[] = [];

async function fetchIsBanned(
    guild: Discord.Guild,
    user: Discord.User
): Promise<boolean> {
    try {
        if (!bannedCache.includes(user.id)) {
            const banUser = await guild.bans.fetch(user);
            bannedCache.push(banUser.user.id);
        }
        return true;
    } catch (err) {
        if ((err as Discord.DiscordAPIError).message === 'Unknown Ban')
            return false;
        throw err;
    }
}

async function fetchMember(
    guild: Discord.Guild,
    user: Discord.User
): Promise<boolean> {
    try {
        await guild.members.fetch(user);
        return true;
    } catch (err) {
        if ((err as Discord.DiscordAPIError).message === 'Unknown Member')
            return false;
        throw err;
    }
}

export default async function spy(message: Discord.Message): Promise<void> {
    const { guild, member, content, client, author, channel, attachments } =
        message;
    if (
        !guild ||
        !member ||
        guild.id !== '818961659086766111' ||
        !channel.isText()
    )
        return;

    const communityDiscord = client.guilds.cache.get(
        process.env.COMMUNITY_SERVER_ID ?? ''
    );
    const spyLog = communityDiscord?.channels.cache.get(
        channelIds['hack-discord-spy-log']
    );
    if (!communityDiscord || !spyLog) return;
    const isBanned = await fetchIsBanned(communityDiscord, author);
    const isCommunityDiscordMember = isBanned
        ? false
        : await fetchMember(communityDiscord, author);
    if (!spyLog?.isText()) return;
    const sensitiveWords =
        /\b(hack\w*)|(buy\w*)|(sell\w*)|(boost\w*)|(account\w*)|(price\w*)|(carry\w*)|(carried)|(c(?:lass)? ?15)|(\$)\b/gi;
    const triggered = Array.from(content.matchAll(sensitiveWords));
    const [sliced1, sliced2] = [content.slice(0, 1024), content.slice(1024)];
    let embed = new Discord.MessageEmbed()
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
        .addField('In Channel', `#${(channel as Discord.GuildChannel).name}`)
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
    const sentMessage = await spyLog.send({
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
    });
    if (!isBanned) await sentMessage.react(banHammer);
}

async function cleanUpMessage(
    message: Discord.Message,
    id: string
): Promise<void> {
    const { embeds, author, reactions, client } = message;
    if (!embeds[0] || author.id !== (client.user as Discord.ClientUser).id)
        return;
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
        embed.fields[1].value = '✔️';
        await message.edit({ embeds: [embed] });
    }
    embed.color = 0;
    if (reactions.cache.size) {
        await reactions.removeAll();
    }
}

export async function spyLogBanHandler(
    reaction: Discord.MessageReaction,
    userInitial: Discord.User | Discord.PartialUser
): Promise<void> {
    const { message, client } = reaction;
    const { channel, guild, embeds, author } = message;
    const user = userInitial.partial
        ? await client.users.fetch(userInitial.id)
        : userInitial;
    if (
        !guild ||
        !guild.members.cache.get(user.id)?.permissions.has('BAN_MEMBERS') ||
        channel.id !== channelIds['hack-discord-spy-log'] ||
        !embeds[0] ||
        author?.id !== (client.user as Discord.ClientUser).id ||
        reaction.emoji.identifier !== banHammer
    )
        return;

    const { fields } = embeds[0];
    if (fields[0]?.name !== 'User') return;
    const id = fields[0]?.value?.match(/ID: (\d{18})$/m)?.[1];
    if (!id) return;
    const banned = await guild.bans.fetch();
    if (banned.some(({ user: u }) => u.id === id)) return;
    await guild.members.ban(id, {
        reason: 'Random Dice Hack Discord related activity\nFeel free to [appeal here](https://discord.gg/yJBdSRZJmS) if you found this ban to be unjustified.',
    });
    channel.messages.cache.forEach(m => cleanUpMessage(m, id));
}

export async function fetchSpyLogOnBoot(client: Discord.Client): Promise<void> {
    const guild = await client.guilds.fetch(
        process.env.COMMUNITY_SERVER_ID || ''
    );
    const channel = guild.channels.cache.get(
        channelIds['hack-discord-spy-log']
    );
    if (!channel?.isText()) return;
    await channel.messages.fetch();
}
