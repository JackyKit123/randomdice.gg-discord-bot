import * as firebase from 'firebase-admin';
import * as Discord from 'discord.js';
import cooldown from '../../helper/cooldown';
import cache from '../../helper/cache';

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
    message: Discord.Message,
    output: 'silence' | 'emit' | 'emit new member',
    optionalTarget?: Discord.GuildMember
): Promise<number | false> {
    const app = firebase.app();
    const database = app.database();
    const numberFormat = new Intl.NumberFormat();
    const { member, channel, guild } = message;
    if (!guild || !member) return false;
    if (output === 'emit') {
        if (
            await cooldown(message, `!balance`, {
                default: 10 * 1000,
                donator: 2 * 1000,
            })
        ) {
            return false;
        }
    }

    const memberArg = message.content.split(' ')[1];
    let target = optionalTarget || member;
    if (memberArg && !optionalTarget) {
        target =
            guild.members.cache.find(
                m =>
                    m.user.id === memberArg ||
                    m.user.username.toLowerCase() ===
                        memberArg?.toLowerCase() ||
                    m.nickname?.toLowerCase() === memberArg?.toLowerCase() ||
                    `${m.user.username}#${m.user.discriminator}`.toLowerCase() ===
                        memberArg?.toLowerCase() ||
                    m.user.id === memberArg?.match(/<@!?(\d{18})>/)?.[1]
            ) ||
            guild.member(memberArg || member.id) ||
            member;
    }

    if (!Object.keys(cache['discord_bot/community/currency']).length)
        return false;
    const profile = cache['discord_bot/community/currency'][target.id];

    let prestigeLevel = 0;
    prestigeRoleIds.forEach(id => {
        if (target.roles.cache.has(id)) prestigeLevel += 1;
    });
    const embed = new Discord.MessageEmbed()
        .setAuthor(
            `${target.user.username}#${target.user.discriminator}`,
            target.user.avatarURL({
                dynamic: true,
            }) ?? undefined
        )
        .setColor(target.displayHexColor)
        .setTitle(`${target?.id === member.id ? 'Your' : 'Their'} Balance`)
        .setFooter(
            prestigeLevel > 0
                ? member.guild.roles.cache.get(
                      prestigeRoleIds[prestigeLevel - 1]
                  )?.name
                : ''
        );
    if (!profile || !profile.initiated) {
        if (target.id !== member.id && output === 'emit') {
            await channel?.send(
                'They have not started using currency command yet.'
            );
            return profile.balance || 10000;
        }
        await database
            .ref(`discord_bot/community/currency/${target.id}/balance`)
            .set(profile.balance || 10000);
        await database
            .ref(`discord_bot/community/currency/${target.id}/prestige`)
            .set(prestigeLevel);
        if (output === 'emit new member' || output === 'emit') {
            await channel.send(
                'Looks like you are the first time using server currency command, you have been granted **<:Dice_TierX_Coin:813149167585067008> 10,000** as a starter reward.',
                embed.setDescription(
                    `<:Dice_TierX_Coin:813149167585067008> ${numberFormat.format(
                        profile.balance || 10000
                    )}`
                )
            );
        }
        return output === 'silence' ? profile.balance || 10000 : false;
    }
    if (output !== 'emit') {
        return profile.balance;
    }
    await channel.send(
        embed.setDescription(
            `<:Dice_TierX_Coin:813149167585067008> ${numberFormat.format(
                profile.balance
            )}`
        )
    );
    return false;
}
