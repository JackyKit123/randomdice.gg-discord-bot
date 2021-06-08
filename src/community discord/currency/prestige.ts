import Discord from 'discord.js';
import firebase from 'firebase-admin';
import getBalance from './balance';
import cooldown from '../../util/cooldown';
import cache from '../../util/cache';

export default async function prestige(
    message: Discord.Message
): Promise<void> {
    const { member, channel, guild } = message;
    const app = firebase.app();
    const database = app.database();
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

    const prestigeLevels = {
        1: { id: '806312627877838878', coinsNeeded: 250000 },
        2: { id: '806896328255733780', coinsNeeded: 500000 },
        3: { id: '806896441947324416', coinsNeeded: 750000 },
        4: { id: '809142950117245029', coinsNeeded: 100000 },
        5: { id: '809142956715671572', coinsNeeded: 125000 },
        6: { id: '809142968434950201', coinsNeeded: 150000 },
        7: { id: '809143362938339338', coinsNeeded: 175000 },
        8: { id: '809143374555774997', coinsNeeded: 200000 },
        9: { id: '809143390791925780', coinsNeeded: 225000 },
        10: { id: '809143588105486346', coinsNeeded: 250000 },
    } as {
        [level: number]: {
            id: string;
            coinsNeeded: number;
        };
    };

    const currentPrestigeLevel = Number(
        Object.entries(prestigeLevels)
            .sort(([a], [b]) => Number(b) - Number(a))
            .find(([, prestigeInfo]) =>
                member.roles.cache.has(prestigeInfo.id)
            )?.[0] || 0
    );

    if (currentPrestigeLevel === 10) {
        await channel.send(
            'You are already max prestige, you cannot prestige anymore.'
        );
        return;
    }

    const nextPrestigeLevel = currentPrestigeLevel + 1;
    const progress = balance / prestigeLevels[nextPrestigeLevel].coinsNeeded;
    if (balance < prestigeLevels[nextPrestigeLevel].coinsNeeded) {
        await channel.send(
            new Discord.MessageEmbed()
                .setAuthor(
                    `${member.user.username}#${member.user.discriminator}`,
                    member.user.avatarURL({
                        dynamic: true,
                    }) ?? undefined
                )
                .setColor(member.displayHexColor)
                .setTitle('Prestige Progress')
                .setDescription(
                    `${'■'.repeat(
                        Math.max(0, Math.floor(progress * 10))
                    )}${'□'.repeat(
                        Math.min(10 - Math.floor(progress * 10), 10)
                    )}(${Math.floor(progress * 1000) / 10}%)`
                )
                .addField(
                    'Prestige Cost',
                    `<:dicecoin:839981846419079178> ${numberFormat.format(
                        prestigeLevels[nextPrestigeLevel].coinsNeeded
                    )}`
                )
                .addField(
                    'Your Balance',
                    `<:dicecoin:839981846419079178> ${numberFormat.format(
                        balance
                    )}`
                )
        );
        return;
    }

    if (balance >= prestigeLevels[nextPrestigeLevel].coinsNeeded) {
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
                guild.roles.cache.get(prestigeLevels[nextPrestigeLevel].id)
                    ?.name || prestigeLevels[nextPrestigeLevel].id
            }** role. Type \`prestige me\` if you want to prestige now.${
                donation
                    ? `\n⭐Since you are a patreon donator, when you prestige, you can keep ${donation}% of your current balance!`
                    : ''
            }`
        );
        const awaitedMessage = await channel.awaitMessages(
            (newMessage: Discord.Message) =>
                newMessage.author.id === member.id &&
                newMessage.content.toLowerCase() === 'prestige me',
            { time: 60000, max: 1 }
        );
        if (awaitedMessage.first()?.content.toLowerCase() === 'prestige me') {
            await member.roles.add(
                prestigeLevels[nextPrestigeLevel].id,
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
                    guild.roles.cache.get(prestigeLevels[nextPrestigeLevel].id)
                        ?.name || prestigeLevels[nextPrestigeLevel].id
                }**`
            );
        }
    }
}
