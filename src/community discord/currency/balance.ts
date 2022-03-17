import { database } from 'register/firebase';
import {
    ApplicationCommandData,
    ButtonInteraction,
    CommandInteraction,
    GuildMember,
    Interaction,
    Message,
    MessageEmbed,
    UserContextMenuInteraction,
} from 'discord.js';
import cooldown from 'util/cooldown';
import cache from 'util/cache';
import { coinDice } from 'config/emojiId';
import { getPrestigeLevelName } from 'community discord/util/checkPrestigeLevel';
import { reply } from 'util/typesafeReply';

const numberFormat = new Intl.NumberFormat();

const getEmbed = (
    target: GuildMember,
    targetIsAuthor: boolean,
    bal: number
) => {
    const prestigeLevel = getPrestigeLevelName(target);

    let embed = new MessageEmbed()
        .setAuthor({
            name: target.user.tag,
            iconURL:
                target.displayAvatarURL({
                    dynamic: true,
                }) ?? undefined,
        })
        .setColor(target.displayHexColor)
        .setTitle(`${targetIsAuthor ? 'Your' : 'Their'} Balance`)
        .setDescription(`${coinDice} ${numberFormat.format(bal)}`);

    if (prestigeLevel) {
        embed = embed.setFooter({
            text: prestigeLevel,
        });
    }

    return embed;
};

export async function getBalance(
    input:
        | Message
        | ButtonInteraction
        | CommandInteraction
        | UserContextMenuInteraction,
    silence = false,
    optionalTarget?: GuildMember | null
): Promise<number | null> {
    if (input instanceof Interaction && !input.inCachedGuild()) return null;
    const { member, channel } = input;
    if (!member) return null;

    const target = optionalTarget ?? member;

    if (!Object.keys(cache['discord_bot/community/currency']).length)
        return null;
    const profile = cache['discord_bot/community/currency'][target.id];

    if (!profile?.initiated) {
        if (target.id !== member.id && !silence) {
            await reply(
                input,
                'They have not started using currency command yet.'
            );
            return null;
        }

        const bal = Number(profile?.balance) || 10000;
        await database
            .ref(`discord_bot/community/currency/${target.id}/balance`)
            .set(bal);
        await database
            .ref(`discord_bot/community/currency/${target.id}/prestige`)
            .set(0);
        if (!silence && !(input instanceof Message)) {
            const messageOption = {
                content: `${member}, Looks like you are the first time using server currency command, you have been granted **${coinDice} 10,000** as a starter reward. You can use ${
                    input.isCommand() || input.isContextMenu()
                        ? `\`${input.commandName}\` command`
                        : 'the button'
                } again.`,
                embeds: [getEmbed(target, target.id === member.id, bal)],
            };
            await database
                .ref(`discord_bot/community/currency/${target.id}/initiated`)
                .set(true);
            if (!channel) {
                await input.reply(messageOption);
                return null;
            }
            await channel.send(messageOption);
        }
        return bal;
    }

    return Number(profile.balance);
}

export default async function balance(
    interaction: CommandInteraction | UserContextMenuInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;

    const { options, member } = interaction;

    const target = options.getMember('user') ?? member;
    const bal = await getBalance(interaction, false, target);

    if (
        bal === null ||
        (await cooldown(
            interaction,
            {
                default: 10 * 1000,
                donator: 2 * 1000,
            },
            'balance'
        ))
    ) {
        return;
    }

    await interaction.reply({
        embeds: [getEmbed(target, target.id === member.id, bal)],
    });
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
