import Discord from 'discord.js';
import { database } from 'register/firebase';
import cooldown from 'util/cooldown';
import cache from 'util/cache';
import { prestigeRoles } from 'config/roleId';
import { coinDice } from 'config/emojiId';
import getBalance from './balance';

export default async function prestige(
    message: Discord.Message
): Promise<void> {
    const { member, channel, guild } = message;
    const numberFormat = new Intl.NumberFormat();
    if (
        await cooldown(message, `!prestige`, {
            default: 20 * 1000,
            donator: 5 * 1000,
        })
    )
        return;
    if (!member || !guild) return;
    const balance = await getBalance(message, 'emit new member');
    if (balance === false) return;

    const currentPrestigeLevel = Number(
        Object.entries(prestigeRoles)
            .sort(([a], [b]) => Number(b) - Number(a))
            .find(([, roleId]) => member.roles.cache.has(roleId))?.[0] || 0
    );

    if (currentPrestigeLevel === 10) {
        await channel.send(
            'You are already max prestige, you cannot prestige anymore.'
        );
        return;
    }

    const nextPrestigeLevel = currentPrestigeLevel + 1;
    const progress = balance / (nextPrestigeLevel * 250000);
    if (progress < 1) {
        await channel.send({
            embeds: [
                new Discord.MessageEmbed()
                    .setAuthor({
                        name: member.user.tag,
                        iconURL: member.user.displayAvatarURL({
                            dynamic: true,
                        }),
                    })
                    .setColor(member.displayHexColor)
                    .setTitle('Prestige Progress')
                    .setDescription(
                        `${'■'.repeat(
                            Math.max(0, Math.floor(progress * 10))
                        )}${'□'.repeat(
                            Math.min(
                                Math.max(10 - Math.floor(progress * 10), 0),
                                10
                            )
                        )}(${Math.floor(progress * 1000) / 10}%)`
                    )
                    .addField(
                        'Prestige Cost',
                        `${coinDice} ${numberFormat.format(
                            nextPrestigeLevel * 250000
                        )}`
                    )
                    .addField(
                        'Your Balance',
                        `${coinDice} ${numberFormat.format(balance)}`
                    ),
            ],
        });
        return;
    }

    if (progress >= 1) {
        const userIsDonator = Object.values(cache.users).find(
            user =>
                user['linked-account'].discord === member.id &&
                Boolean(user['patreon-tier'])
        );
        const tier = userIsDonator?.['patreon-tier'];
        let donation = 0;
        switch (tier) {
            case 1:
                donation = 5;
                break;
            case 2:
                donation = 10;
                break;
            case 3:
                donation = 20;
                break;
            case 4:
                donation = 50;
                break;
            default:
        }
        await channel.send(
            `You can prestige now.\n⚠️ Warning, if you choose to prestige now, your balance and dice drawn will be reset in exchange for the **${
                guild.roles.cache.get(prestigeRoles[nextPrestigeLevel])?.name ||
                prestigeRoles[nextPrestigeLevel]
            }** role. Type \`prestige me\` if you want to prestige now.${
                donation
                    ? `\n⭐Since you are a patreon donator, when you prestige, you can keep ${donation}% of your current balance!`
                    : ''
            }`
        );
        const awaitedMessage = await channel.awaitMessages({
            filter: (newMessage: Discord.Message) =>
                newMessage.author.id === member.id &&
                newMessage.content.toLowerCase() === 'prestige me',
            time: 60000,
            max: 1,
        });
        if (awaitedMessage.first()?.content.toLowerCase() === 'prestige me') {
            await member.roles.add(
                prestigeRoles[nextPrestigeLevel],
                'Member Prestige'
            );
            await database
                .ref(`discord_bot/community/currency/${member.id}/prestige`)
                .set(nextPrestigeLevel);
            await database
                .ref(`discord_bot/community/currency/${member.id}/balance`)
                .set(Math.round((balance * donation) / 100));
            await database
                .ref(`discord_bot/community/currency/${member.id}/diceDrawn`)
                .set(0);
            await channel.send(
                `Congratulations on achieving **${
                    guild.roles.cache.get(prestigeRoles[nextPrestigeLevel])
                        ?.name || prestigeRoles[nextPrestigeLevel]
                }**`
            );
        }
    }
}
