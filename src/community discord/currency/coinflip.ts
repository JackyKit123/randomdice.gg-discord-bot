import { database } from 'register/firebase';
import {
    ApplicationCommandData,
    ButtonInteraction,
    CommandInteraction,
    GuildMember,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
} from 'discord.js';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import { tier4RoleIds } from 'config/roleId';
import { coinDice } from 'config/emojiId';
import isBotChannels from 'community discord/util/isBotChannels';
import { getBalance } from './balance';

const memberDefaultCoinFlip = new Map<GuildMember, number>();

export default async function coinflip(
    interaction: CommandInteraction | ButtonInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const numberFormat = new Intl.NumberFormat();
    const { channel, member, user } = interaction;

    const balance = await getBalance(interaction);
    if (balance === null) return;

    if (
        !channel ||
        (await cooldown(
            interaction,
            {
                default: 10 * 1000,
                donator: 5 * 1000,
            },
            'coinflip'
        ))
    )
        return;

    const gambleProfile =
        cache['discord_bot/community/currency'][member.id]?.gamble;

    const isHead =
        interaction instanceof CommandInteraction
            ? interaction.options.getString('side', true) === 'head'
            : interaction.customId === 'coinflip-head';
    const isTail = !isHead;

    if (balance < 100) {
        await interaction.reply(
            `${user} You do not even have ${coinDice} 100 to bet on a coin flip.`
        );
        return;
    }
    const memberIsTier4 = member.roles.cache.hasAny(...tier4RoleIds);
    const amountArg =
        (interaction instanceof CommandInteraction
            ? interaction.options.getString('amount')
            : memberDefaultCoinFlip.get(member)) ?? 100;
    const amount =
        memberIsTier4 && amountArg === 'max' ? balance : Number(amountArg);

    if (!Number.isInteger(amount) || amount < 100 || amount > 10000) {
        await interaction.reply(
            `Coinflip amount must be an integer between 100 - 10000${
                // eslint-disable-next-line no-nested-ternary
                member.roles.cache.hasAny(...tier4RoleIds)
                    ? ' or `max`'
                    : amountArg === 'max'
                    ? `, betting \`max\` is only allowed for ${tier4RoleIds
                          .map(id => `<@&${id}>`)
                          .join(' ')}`
                    : ''
            }.`
        );
        return;
    }

    if (amount > balance) {
        await interaction.reply(
            `${user} You cannot coinflip that much, you are not rich enough.`
        );
        return;
    }
    memberDefaultCoinFlip.set(member, amount);

    const flip = Math.random() < 0.5 ? 'head' : 'tail';
    const won = (flip === 'head' && isHead) || (flip === 'tail' && isTail);
    const gainMultiplier = won ? 1 : -1;
    await database
        .ref(`discord_bot/community/currency/${member.id}/balance`)
        .set(balance + amount * gainMultiplier);
    await database
        .ref(
            `discord_bot/community/currency/${member.id}/gamble/${
                won ? 'gain' : 'lose'
            }`
        )
        .set(
            Number(gambleProfile?.[won ? 'gain' : 'lose'] || 0) +
                Math.abs(amount * gainMultiplier)
        );
    await interaction.reply({
        embeds: [
            new MessageEmbed()
                .setAuthor({
                    name: user.tag,
                    iconURL: member.displayAvatarURL({ dynamic: true }),
                })
                .setColor(won ? '#99ff00' : '#ff0000')
                .setTitle(
                    `It is ${flip.toUpperCase()}!!! You ${
                        won ? 'Won' : 'Lost'
                    }!`
                )
                .setThumbnail(
                    flip === 'head'
                        ? 'https://e7.pngegg.com/pngimages/140/487/png-clipart-dogecoin-cryptocurrency-digital-currency-doge-mammal-cat-like-mammal.png'
                        : 'https://mpng.subpng.com/20180413/sge/kisspng-dogecoin-cryptocurrency-dash-digital-currency-doge-5ad13b0da01474.3329552115236615816557.jpg'
                )
                .setDescription(
                    `You ${
                        won ? 'won' : 'lost'
                    } ${coinDice} ${numberFormat.format(amount)}`
                )
                .addField(
                    'Current Balance',
                    `${coinDice} ${numberFormat.format(
                        Number(balance) + amount * gainMultiplier
                    )}`
                ),
        ],
        components: [
            new MessageActionRow().addComponents(
                ['head', 'tail'].map(side =>
                    new MessageButton()
                        .setStyle('PRIMARY')
                        .setCustomId(`coinflip-${side}`)
                        .setLabel(`Bet ${side} again`)
                        .setEmoji(coinDice)
                )
            ),
        ],
        ephemeral: !isBotChannels(channel),
    });
}

export const commandData: ApplicationCommandData = {
    name: 'coinflip',
    description: 'Flip a coin and bet on it.',
    options: [
        {
            name: 'side',
            type: 3,
            description: 'The side of the coin to bet on.',
            required: true,
            choices: [
                {
                    name: 'head',
                    value: 'head',
                },
                {
                    name: 'tail',
                    value: 'tail',
                },
            ],
        },
        {
            name: 'amount',
            type: 3,
            description:
                'The amount to bet default to 100, exclusive to tier 4 roles, bet "max" to bet all your balance.',
        },
    ],
};
