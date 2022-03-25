import roleIds from 'config/roleId';
import { ApplicationCommandData, Client, CommandInteraction } from 'discord.js';
import cooldown from 'util/cooldown';
import { clown as clownEmoji, coinDice } from 'config/emojiId';
import { getCommunityDiscord } from 'config/guild';
import { isJackykit } from 'config/users';
import wait from 'util/wait';
import commandCost from './commandCost';

export default async function clown(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { options, member, channel } = interaction;

    if (
        !channel ||
        (await cooldown(interaction, {
            default: 60 * 1000 * 5,
            donator: 60 * 1000 * 1,
        }))
    ) {
        return;
    }
    const randomCost = Math.round(Math.random() * 3500 - 1500);
    let responseText = '';
    if (!(await commandCost(interaction, randomCost))) {
        responseText = `You need at least ${coinDice} ${randomCost} to use \`/clown\`\nUsually that's the case, but today I am gonna allow you to use it.<a:clowndance:845532985787940894>`;
        await interaction.editReply(responseText);
    }
    let target = options.getMember('member', true);

    if (target?.id === member.id && member.roles.cache.has(roleIds['🤡'])) {
        await (interaction.replied
            ? interaction.followUp('Slow Down. You are already a clown, jeez.')
            : interaction.reply('Slow Down. You are already a clown, jeez.'));
        return;
    }

    const response = await (responseText
        ? interaction.editReply(
              `${responseText}\n\nhttps://media.tenor.com/images/87126cc81f03e22938d296cc5a60b2d2/tenor.gif`
          )
        : interaction.reply(
              'https://media.tenor.com/images/87126cc81f03e22938d296cc5a60b2d2/tenor.gif'
          ));
    await wait(4700);

    let clownedABot = false;
    responseText = `${target} got clowned by ${member}.${clownEmoji}`;
    if (target.id === member.id) {
        responseText = `${member}, you have a weird interest, but yes you can be a clown yourself, now entertain us.`;
    } else if (isJackykit(member)) {
        responseText = `${target} got clowned by ${member}.${clownEmoji}`;
    } else if (target.roles.cache.has(roleIds['🤡'])) {
        responseText = `${target} has already been clowned. Why are you so desperate? I guess you are the real clown then.`;
        target = member;
    } else if (target.user.bot) {
        responseText = `What's wrong in your mind to clown a bot? Good Try tho, you clown.`;
        clownedABot = true;
        target = member;
    } else if (
        isJackykit(target) ||
        (target.id !== member.id && Math.random() < 0.6)
    ) {
        responseText = `${member} is trying clown ${target}. **BUT IT BACKFIRED, ${member} is now a clown LOL!!!**`;
        target = member;
    }
    await ((response && response.edit(responseText)) ||
        interaction.editReply(responseText));

    const originalName = target.displayName;
    const howClown =
        clownedABot || isJackykit(member) ? 10 : Math.ceil(Math.random() * 10);

    await target.roles.add(roleIds['🤡']);
    if (target.manageable) await target.setNickname('🤡'.repeat(howClown));

    responseText = `${responseText}\n\n${target} ${
        clownedABot ? 'tried to clown a bot. 100%' : `is a ${howClown * 10}%`
    } clown!${clownEmoji}`;

    await ((response && response.edit(responseText)) ||
        interaction.editReply(responseText));
    await wait(1000 * 60 * 5);

    await target.roles.remove(roleIds['🤡']);

    await wait(5000);
    if (target.manageable) await target.setNickname(originalName);
}

export async function fixClownNicknamesOnReboot(
    client: Client<true>
): Promise<void> {
    const guild = getCommunityDiscord(client);
    await Promise.all(
        (
            await guild.fetchAuditLogs({
                user: client.user,
                type: 'MEMBER_UPDATE',
            })
        ).entries
            .filter(
                ({ createdTimestamp }) =>
                    Date.now() - createdTimestamp <= 1000 * 60 * 10
            )
            .map(async ({ target, changes }) => {
                const memberNicknameUpdated: string[] = [];
                if (!target) return;
                const member = await guild.members.fetch(target.id);
                changes?.forEach(async change => {
                    if (change.key === 'nick') {
                        if (
                            typeof change.new === 'string' &&
                            /^\u{1F921}{1,10}$/u.test(change.new)
                        ) {
                            if (
                                typeof change.old === 'string' &&
                                /^\u{1F921}{1,10}$/u.test(change.old) &&
                                memberNicknameUpdated.includes(member.id)
                            ) {
                                return;
                            }
                            await member.setNickname(
                                typeof change.old === 'string'
                                    ? change.old
                                    : null
                            );
                            memberNicknameUpdated.push(member.id);
                        }
                    }
                });
            })
    );
}

export const commandData: ApplicationCommandData = {
    name: 'clown',
    description: 'Whoever you want to clown, clown!',
    options: [
        {
            name: 'member',
            description: 'The member who deserves to be clowned',
            required: true,
            type: 'USER',
        },
    ],
};
