import { database } from 'register/firebase';
import {
    ApplicationCommandData,
    CommandInteraction,
    GuildMember,
    MessageEmbed,
} from 'discord.js';
import cooldown from 'util/cooldown';
import checkPermission from 'community discord/util/checkPermissions';
import { eventManagerRoleIds } from 'config/roleId';
import channelIds from 'config/channelIds';
import { coinDice } from 'config/emojiId';
import { getBalance } from './balance';

export default async function currency(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { options, guild, member, commandName } = interaction;

    const numberFormat = new Intl.NumberFormat();
    if (
        (await cooldown(interaction, commandName, {
            default: 60 * 1000,
            donator: 60 * 1000,
        })) ||
        !(await checkPermission(interaction, ...eventManagerRoleIds))
    )
        return;

    const targets = new Array(20)
        .fill('')
        .map((_, i) => options.getMember(`member-${i + 1}`))
        .filter(target => !!target) as GuildMember[];

    const amount = options.getInteger('amount', true);

    const botTargets = targets.filter(target => target.user.bot);
    if (botTargets.length) {
        await interaction.reply(
            `${botTargets} ${
                botTargets.length > 1 ? 'are' : 'is'
            } bot user. You cannot audit the currency of bot users`
        );
        return;
    }
    if (amount > 50000 && !member.permissions.has('ADMINISTRATOR')) {
        await interaction.reply(
            `The audit amount is too large (> ${coinDice} 50,000), you need \`ADMINISTRATOR\` permission to enter that large amount.`
        );
        return;
    }

    await Promise.all(
        targets.map(async target => {
            const balance = await getBalance(interaction, true, target);
            if (balance === null) return;
            await database
                .ref(`discord_bot/community/currency/${target?.id}/balance`)
                .set(balance + amount);
        })
    );

    const deduction = amount < 0;
    await interaction.reply({
        content: `You have ${
            deduction ? 'taken away' : 'given'
        } ${coinDice} ${numberFormat.format(Math.abs(amount))} ${
            deduction ? 'from' : 'to'
        } ${targets.join(' ')}`,
        allowedMentions: {
            users: [],
            repliedUser: false,
        },
    });
    const logChannel = guild.channels.cache.get(channelIds['currency-log']);
    if (logChannel?.isText()) {
        await logChannel.send({
            embeds: [
                new MessageEmbed()
                    .setTitle('Currency Audit')
                    .setAuthor({
                        name: member.displayName,
                        iconURL: member.user.displayAvatarURL({
                            dynamic: true,
                        }),
                    })
                    .setColor(amount > 0 ? '#00ff00' : '#ff0000')
                    .addField(
                        'Audited Amount',
                        `${coinDice} **${
                            amount > 0 ? '+' : '-'
                        }${numberFormat.format(Math.abs(amount))}**`
                    )
                    .addField(
                        'Audited Members',
                        targets
                            .map(target => `${target.user.tag} ${target}`)
                            .join('\n')
                    )
                    .setTimestamp(),
            ],
        });
    }
}

export const commandData: ApplicationCommandData = {
    name: 'currency-audit',
    description: 'Audit the balance of up to 20 members.',
    defaultPermission: false,
    options: [
        {
            name: 'amount',
            description: 'The amount to add or deduct.',
            type: 'INTEGER',
            required: true,
        },
        ...new Array(20).fill('').map((_, i) => ({
            name: `member-${i + 1}`,
            description: `The member to add or deduct the amount from.`,
            type: 6,
            required: i === 0,
        })),
    ],
};
