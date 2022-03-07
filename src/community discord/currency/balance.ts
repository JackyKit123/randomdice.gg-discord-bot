import { database } from 'register/firebase';
import {
    ApplicationCommandData,
    ButtonInteraction,
    CommandInteraction,
    GuildMember,
    Message,
    MessageEmbed,
    UserContextMenuInteraction,
} from 'discord.js';
import cooldown from 'util/cooldown';
import fetchMention from 'util/fetchMention';
import cache from 'util/cache';

const prestigeRoleIds = [
    '806312627877838878',
    '806896328255733780',
    '806896441947324416',
    '809142950117245029',
    '809142956715671572',
    '809142968434950201',
    '809143362938339338',
    '809143374555774997',
    '809143390791925780',
    '809143588105486346',
];

export default async function balance(
    input:
        | Message
        | ButtonInteraction
        | CommandInteraction
        | UserContextMenuInteraction,
    output: 'silence' | 'emit' | 'emit new member',
    optionalTarget?: GuildMember
): Promise<number | false> {
    const numberFormat = new Intl.NumberFormat();
    const { member, channel, guild, client } = input;
    if (!guild || !member) return false;
    if (output === 'emit') {
        if (
            await cooldown(input, `!balance`, {
                default: 10 * 1000,
                donator: 2 * 1000,
            })
        ) {
            return false;
        }
    }

    let target = guild.members.cache.get(
        optionalTarget?.id || member.user.id
    ) as GuildMember;
    if (input instanceof Message) {
        const memberArg = input.content.split(' ')[1];

        if (memberArg && !optionalTarget && output === 'emit') {
            target =
                (await fetchMention(memberArg, guild, {
                    content: input.content,
                    mentionIndex: 1,
                })) || target;
        }
    }

    if (!Object.keys(cache['discord_bot/community/currency']).length)
        return false;
    const profile = cache['discord_bot/community/currency'][target.id];

    let prestigeLevel = 0;
    prestigeRoleIds.forEach(id => {
        if (target.roles.cache.has(id)) prestigeLevel += 1;
    });
    const embed = new MessageEmbed()
        .setAuthor({
            name: target.user.tag,
            iconURL:
                target.displayAvatarURL({
                    dynamic: true,
                }) ?? undefined,
        })
        .setColor(target.displayHexColor)
        .setTitle(`${target?.id === member.user.id ? 'Your' : 'Their'} Balance`)
        .setFooter(
            prestigeLevel > 0
                ? {
                      text:
                          guild.roles.cache.get(
                              prestigeRoleIds[prestigeLevel - 1]
                          )?.name ?? '',
                  }
                : null
        );
    if (!profile || !profile.initiated) {
        if (target.id !== member.user.id && output !== 'silence') {
            await channel?.send(
                'They have not started using currency command yet.'
            );
            return false;
        }
        await database
            .ref(`discord_bot/community/currency/${target.id}/balance`)
            .set(Number(profile?.balance) || 10000);
        await database
            .ref(`discord_bot/community/currency/${target.id}/prestige`)
            .set(prestigeLevel);
        if (output === 'emit new member' || output === 'emit') {
            await (channel ?? client.users.cache.get(member.user.id))?.send({
                content:
                    'Looks like you are the first time using server currency command, you have been granted **<:dicecoin:839981846419079178> 10,000** as a starter reward.',
                embeds: [
                    embed.setDescription(
                        `<:dicecoin:839981846419079178> ${numberFormat.format(
                            Number(profile?.balance) || 10000
                        )}`
                    ),
                ],
            });
            await database
                .ref(`discord_bot/community/currency/${target.id}/initiated`)
                .set(true);
            if (input instanceof Message) {
                client.emit('messageCreate', input);
            }
        }
        return output === 'silence' ? Number(profile?.balance) || 10000 : false;
    }
    if (output !== 'emit') {
        return Number(profile.balance);
    }
    await (channel ?? client.users.cache.get(member.user.id))?.send({
        embeds: [
            embed.setDescription(
                `<:dicecoin:839981846419079178> ${numberFormat.format(
                    Number(profile?.balance)
                )}`
            ),
        ],
    });
    return false;
}

export const commandData: ApplicationCommandData[] = [
    {
        name: 'balance',
        description: "Check your or another user's balance.",
        options: [
            {
                name: 'user',
                description: 'The user to check the balance of.',
                type: 6,
            },
        ],
    },
    {
        name: 'Check Balance',
        type: 'USER',
    },
];
