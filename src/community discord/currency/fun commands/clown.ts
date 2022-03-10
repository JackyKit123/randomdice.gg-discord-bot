import roleIds from 'config/roleId';
import {
    ApplicationCommandData,
    Client,
    CommandInteraction,
    GuildAuditLogsEntry,
    GuildAuditLogsResolvable,
} from 'discord.js';
import { promisify } from 'util';
import cooldown from 'util/cooldown';
import { clown as clownEmoji } from 'config/emojiId';
import commandCost from './commandCost';

const wait = promisify(setTimeout);

export default async function clown(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { options, member, channel } = interaction;

    if (
        !channel ||
        (await cooldown(interaction, '!clown', {
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
    } else if (
        member.id === '195174308052467712' ||
        (['722951439567290458', '415166565550653442'].includes(target.id) &&
            Math.random() < 0.95)
    ) {
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
        target.id === '195174308052467712' ||
        (['722951439567290458', '415166565550653442'].includes(target.id) &&
            Math.random() < 0.95) ||
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
        clownedABot || member.id === '195174308052467712'
            ? 10
            : Math.ceil(Math.random() * 10);
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

export async function purgeRolesOnReboot(client: Client): Promise<void> {
    const guild = client.guilds.cache.get(
        process.env.COMMUNITY_SERVER_ID ?? ''
    );
    if (!client.user || !guild) return;
    const roleUpdateLog = await guild.fetchAuditLogs({
        user: client.user,
        type: 'MEMBER_ROLE_UPDATE',
    });
    const nickUpdateLog = await guild.fetchAuditLogs({
        user: client.user,
        type: 'MEMBER_UPDATE',
    });
    const getLast10Minutes = <T extends GuildAuditLogsResolvable = 'ALL'>(
        entry: GuildAuditLogsEntry<T>
    ) => Date.now() - entry.createdTimestamp <= 1000 * 60 * 10;

    await Promise.all([
        ...roleUpdateLog.entries.filter(getLast10Minutes).map(async entry => {
            if (!entry.target) return;
            const member = await guild.members.fetch(entry.target.id);
            if (member.roles.cache.has(roleIds['🤡']))
                await member.roles.remove(roleIds['🤡']);
        }),
        ...nickUpdateLog.entries.filter(getLast10Minutes).map(async entry => {
            const memberNicknameUpdated: string[] = [];
            if (!entry.target) return;
            const member = await guild.members.fetch(entry.target.id);
            entry.changes?.forEach(async change => {
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
                            typeof change.old === 'string' ? change.old : null
                        );
                        memberNicknameUpdated.push(member.id);
                    }
                }
            });
        }),
    ]);
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
