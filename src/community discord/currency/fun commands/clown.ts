import roleIds from 'config/roleId';
import { ApplicationCommandData, Client, CommandInteraction } from 'discord.js';
import { promisify } from 'util';
import cooldown from 'util/cooldown';
import { clown as clownEmoji } from 'config/emojiId';
import { getCommunityDiscord } from 'config/guild';
import { isJackykit } from 'config/users';
import commandCost from './commandCost';

const wait = promisify(setTimeout);

export default async function clown(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { options, member, channel, commandName } = interaction;

    if (
        !channel ||
        (await cooldown(interaction, commandName, {
            default: 60 * 1000 * 5,
            donator: 60 * 1000 * 1,
        })) ||
        !(await commandCost(
            interaction,
            Math.round(Math.random() * 3500 - 1500)
        ))
    ) {
        return;
    }
    let target = options.getMember('member', true);

    if (target?.id === member.id && member.roles.cache.has(roleIds['🤡'])) {
        await interaction.reply('Slow Down. You are already a clown, jeez.');
        return;
    }
    await interaction.reply(
        'https://media.tenor.com/images/87126cc81f03e22938d296cc5a60b2d2/tenor.gif'
    );
    await wait(4700);

    let clownedABot = false;
    if (target.id === member.id) {
        await interaction.editReply(
            `${member}, you have a weird interest, but yes you can be a clown yourself, now entertain us.`
        );
    } else if (isJackykit(member)) {
        await interaction.editReply(
            `${target} got clowned by ${member}.${clownEmoji}`
        );
    } else if (target.roles.cache.has(roleIds['🤡'])) {
        await interaction.editReply(
            `${target} has already been clowned. Why are you so desperate? I guess you are the real clown then.`
        );
        target = member;
    } else if (target.user.bot) {
        await interaction.editReply(
            `What's wrong in your mind to clown a bot? Good Try tho, you clown.`
        );
        clownedABot = true;
        target = member;
    } else if (
        isJackykit(target) ||
        (target.id !== member.id && Math.random() < 0.6)
    ) {
        await interaction.editReply(
            `${member} is trying clown ${target}. **BUT IT BACKFIRED, ${member} is now a clown LOL!!!**`
        );
        target = member;
    } else {
        await interaction.editReply(
            `${target} got clowned by ${member}.${clownEmoji}`
        );
    }
    const originalName = target.displayName;
    const howClown =
        clownedABot || isJackykit(member) ? 10 : Math.ceil(Math.random() * 10);
    try {
        await target.roles.add(roleIds['🤡']);
        await target.setNickname('🤡'.repeat(howClown));
    } catch (err) {
        // suppress error
    } finally {
        await channel.send({
            content: `${target} ${
                clownedABot
                    ? 'tried to clown a bot. 100%'
                    : `is a ${howClown * 10}%`
            } clown!${clownEmoji}`,
            allowedMentions: {
                users: [],
                roles: [],
                parse: [],
            },
        });
        await wait(1000 * 60 * 5);
        try {
            if (target.roles.cache.has(roleIds['🤡'])) {
                await target.roles.remove(roleIds['🤡']);
            }
            await wait(5000);
            await target.setNickname(originalName);
        } catch (err) {
            // suppress error
        }
    }
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
