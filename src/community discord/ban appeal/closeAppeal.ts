import {
    CategoryChannel,
    ClientUser,
    Collection,
    GuildMember,
    Message,
} from 'discord.js';
import cooldown from '../../util/cooldown';
import fetchMentionString from '../../util/fetchMention';

export default async function closeAppeal(message: Message): Promise<void> {
    const { client, content, member, guild, channel } = message;
    const [command, arg] = content.split(' ');
    const { COMMUNITY_SERVER_ID } = process.env;

    if (!member || !guild) {
        return;
    }

    if (
        await cooldown(message, '!closeappeal', {
            default: 60 * 1000,
            donator: 60 * 1000,
        })
    ) {
        return;
    }

    if (!COMMUNITY_SERVER_ID) {
        throw new Error('Missing `COMMUNITY_SERVER_ID` env in bot code.');
    }

    const accept = async (target: GuildMember | string): Promise<void> => {
        (await client.guilds.fetch(COMMUNITY_SERVER_ID)).members.unban(
            target,
            'Appealed accepted in appeal server.'
        );

        try {
            if (target instanceof GuildMember)
                await target.send(
                    'Your appeal is accepted, you may now return to this main server. https://discord.gg/ZrXRpZq2mq'
                );
        } finally {
            guild.members.ban(target, {
                reason: 'Appeal accepted.',
            });
            await channel.send(
                `Accepted appeal for ${
                    target instanceof GuildMember
                        ? `**${target.user.username}#${target.user.discriminator}**`
                        : `<@${target}>`
                }.`
            );
        }
    };

    const reject = async (target: GuildMember | string): Promise<void> => {
        try {
            if (target instanceof GuildMember)
                await target.send('Your appeal is rejected.');
        } finally {
            guild.members.ban(target, {
                reason: 'Appeal rejected.',
            });
            await channel.send(
                `Rejected appeal for ${
                    target instanceof GuildMember
                        ? `**${target.user.username}#${target.user.discriminator}**`
                        : `<@${target}>`
                }.`
            );
        }
    };

    const falsebanned = async (target: GuildMember | string): Promise<void> => {
        (await client.guilds.fetch(COMMUNITY_SERVER_ID)).members.unban(
            target,
            'Appealed accepted in appeal server, member is not guilty.'
        );

        try {
            if (target instanceof GuildMember)
                await target.send(
                    'Your appeal is accepted, you are found to be clean, you may now return to this main server. https://discord.gg/ZrXRpZq2mq'
                );
        } finally {
            await guild.members.kick(
                target,
                'Member is not guilty, appeal closed.'
            );

            await channel.send(
                `Closed appeal for ${
                    target instanceof GuildMember
                        ? `**${target.user.username}#${target.user.discriminator}**`
                        : `<@${target}>`
                }. User is clean.`
            );
        }
    };

    if (!['!accept', '!reject', '!falsebanned'].includes(command)) {
        return;
    }

    let target: string | GuildMember | undefined = await fetchMentionString(
        arg,
        guild,
        {
            content,
            mentionIndex: 1,
        }
    );
    if (!target) {
        target =
            arg.match(/^<@!?(\d{18})>$/)?.[1] || arg.match(/^(\d{18})$/)?.[1];
        if (!target) {
            await channel.send(
                `Usage of the command: \`\`\`${command} <@mention | user id | username>\`\`\``
            );
            return;
        }
    }

    if (!member.permissions.has('BAN_MEMBERS')) {
        await channel.send(
            'You do not have sufficient permission to execute this command.'
        );
        return;
    }

    if (target instanceof GuildMember) {
        const executorRole = member.roles.highest;
        const targetRole = target.roles.highest;
        const clientRole = (
            guild.members.cache.get(
                (client.user as ClientUser).id
            ) as GuildMember
        ).roles.highest;

        if (executorRole.comparePositionTo(targetRole) < 0) {
            await channel.send(
                'You do not have sufficient permission to ban or unban this user.'
            );
            return;
        }

        if (clientRole.comparePositionTo(targetRole) <= 0) {
            await channel.send(
                'I do not have sufficient permission to execute this command.'
            );
            return;
        }
    }

    const archiveCategories = guild.channels.cache.filter(
        chl =>
            /archives/i.test(chl.name) &&
            chl instanceof CategoryChannel &&
            chl.children.size < 50
    ) as Collection<string, CategoryChannel>;
    const archiveCategory =
        archiveCategories.last() ??
        (await guild.channels.create('Archives', {
            type: 'GUILD_CATEGORY',
            position: -1,
        }));

    if (channel.type === 'GUILD_TEXT') await channel.setParent(archiveCategory);

    switch (command) {
        case '!accept':
            accept(target);
            break;
        case '!reject':
            reject(target);
            break;
        case '!falsebanned':
            falsebanned(target);
            break;
        default:
    }
}
