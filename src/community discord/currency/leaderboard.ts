import * as Discord from 'discord.js';
import cache from '../../helper/cache';
import cooldown from '../../helper/cooldown';

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

export default async function leaderboard(
    message: Discord.Message
): Promise<void> {
    const { channel, guild } = message;
    const numberFormat = new Intl.NumberFormat();
    if (!guild) return;
    if (
        await cooldown(message, `!leaderboard`, {
            default: 60 * 1000,
            donator: 10 * 1000,
        })
    )
        return;
    const currencyList = cache['discord_bot/community/currency'];
    const fields = Object.entries(currencyList)
        .sort(
            ([, profileA], [, profileB]) =>
                (profileB.prestige - profileA.prestige) * 100000000000 +
                (profileB.balance - profileA.balance)
        )
        .map(([uid, profile], i) => ({
            name: `#${i + 1}`,
            value: `<@!${uid}> ${
                profile.prestige > 0
                    ? `***${
                          guild.roles.cache.get(
                              prestigeRoleIds[profile.prestige - 1]
                          )?.name
                      }***`
                    : ''
            }\n<:Dice_TierX_Coin:813149167585067008> **__${numberFormat.format(
                profile.balance
            )}__**`,
        }));

    const pageNumbers = Math.ceil(fields.length / 10);
    let currentPage = 0;
    if (currentPage > pageNumbers) {
        currentPage = pageNumbers - 1;
    }

    const embeds = Array(pageNumbers)
        .fill('')
        .map((_, i) =>
            new Discord.MessageEmbed()
                .setColor('#6ba4a5')
                .setThumbnail(
                    'https://cdn.discordapp.com/emojis/813149167585067008.png?v=1'
                )
                .setTitle(`Richest People in the Server`)
                .setAuthor(
                    'Randomdice.gg Server',
                    guild.iconURL({
                        dynamic: true,
                    }) ?? undefined,
                    `https://discord.gg/randomdice`
                )
                .setDescription(
                    `Showing page ${
                        i + 1
                    } of ${pageNumbers}. Use the message reaction to flip page.`
                )
                .addFields(fields.slice(i * 10, i * 10 + 10))
                .setTimestamp()
        );
    const sentMessage = await channel.send(embeds[currentPage]);
    if (pageNumbers <= 1) {
        return;
    }
    await sentMessage.react('⏪');
    await sentMessage.react('◀️');
    await sentMessage.react('▶️');
    await sentMessage.react('⏩');
    const collector = sentMessage.createReactionCollector(
        reaction => ['⏪', '◀️', '▶️', '⏩'].includes(reaction.emoji.name),
        {
            time: 180000,
        }
    );

    collector.on('collect', async (reaction, user) => {
        if (reaction.emoji.name === '⏪') {
            currentPage = 0;
        }
        if (reaction.emoji.name === '◀️' && currentPage > 0) {
            currentPage -= 1;
        }
        if (reaction.emoji.name === '▶️' && currentPage < pageNumbers - 1) {
            currentPage += 1;
        }
        if (reaction.emoji.name === '⏩') {
            currentPage = pageNumbers - 1;
        }
        if (sentMessage.editable) await sentMessage.edit(embeds[currentPage]);
        await reaction.users.remove(user.id);
    });

    collector.on('end', async () => {
        await Promise.all(
            [await sentMessage.reactions.removeAll()].concat(
                sentMessage.editable
                    ? [
                          await sentMessage.edit(
                              `The reaction commands has expired`,
                              embeds[currentPage]
                          ),
                      ]
                    : []
            )
        );
    });
}
