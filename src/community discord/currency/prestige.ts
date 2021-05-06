import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import getBalance from './balance';
import cooldown from '../../helper/cooldown';

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
        1: { id: '806312627877838878', coinsNeeded: 196055 },
        2: { id: '806896328255733780', coinsNeeded: 444055 },
        3: { id: '806896441947324416', coinsNeeded: 792055 },
        4: { id: '809142950117245029', coinsNeeded: 1240055 },
        5: { id: '809142956715671572', coinsNeeded: 1788055 },
        6: { id: '809142968434950201', coinsNeeded: 2436055 },
        7: { id: '809143362938339338', coinsNeeded: 3184055 },
        8: { id: '809143374555774997', coinsNeeded: 4032055 },
        9: { id: '809143390791925780', coinsNeeded: 4980055 },
        10: { id: '809143588105486346', coinsNeeded: 6028055 },
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
                    `${new Array(Math.max(0, Math.floor(progress * 10)))
                        .fill('■')
                        .concat(
                            new Array(
                                Math.min(10 - Math.floor(progress * 10), 10)
                            ).fill('□')
                        )
                        .join('')} (${Math.floor(progress * 1000) / 10}%)`
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
        await channel.send(
            `You can prestige now.\n⚠️ Warning, if you choose to prestige now, your balance will be reset in exchange for the **${
                guild.roles.cache.get(prestigeLevels[nextPrestigeLevel].id)
                    ?.name || prestigeLevels[nextPrestigeLevel].id
            }** role. Type \`prestige me\` if you want to prestige now.`
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
