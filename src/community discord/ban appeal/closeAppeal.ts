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

    const accept = async (target: GuildMember): Promise<void> => {
        try {
            (await client.guilds.fetch(COMMUNITY_SERVER_ID)).members.unban(
                target,
                'Appealed accepted in appeal server.'
            );
        } finally {
            try {
                await target.send(
                    'Your appeal is accepted, you may now return to this main server. https://gg/ZrXRpZq2mq'
                );
            } finally {
                await target.ban({
                    reason: 'Appeal accepted.',
                });
                await channel.send(
                    `Accepted appeal for **${target.user.username}#${target.user.discriminator}**.`
                );
            }
        }
    };

    const reject = async (target: GuildMember): Promise<void> => {
        try {
            await target.send('Your appeal is rejected.');
        } finally {
            await target.ban({
                reason: 'Appeal rejected.',
            });
            await channel.send(
                `Rejected appeal for **${target.user.username}#${target.user.discriminator}**.`
            );
        }
    };

    const falsebanned = async (target: GuildMember): Promise<void> => {
        try {
            (await client.guilds.fetch(COMMUNITY_SERVER_ID)).members.unban(
                target,
                'Appealed accepted in appeal server, member is not guilty.'
            );
        } finally {
            try {
                await target.send(
                    'Your appeal is accepted, you are found to be clean, you may now return to this main server. https://gg/ZrXRpZq2mq'
                );
            } finally {
                await target.kick('Member is not guilty, appeal closed.');
                await channel.send(
                    `Closed appeal for **${target.user.username}#${target.user.discriminator}**. User is clean.`
                );
            }
        }
    };

    if (!['!accept', '!reject', '!falsebanned'].includes(command)) {
        return;
    }

    const target = await fetchMentionString(arg, guild, {
        content,
        mentionIndex: 1,
    });
    if (!target) {
        await channel.send(
            `Usage of the command: \`\`\`${command} <@mention | user id | username>\`\`\``
        );
        return;
    }
    const executorRole = member.roles.highest;
    const executorCanBan = member.permissions.has('BAN_MEMBERS');
    const clientRole = (
        guild.members.cache.get((client.user as ClientUser).id) as GuildMember
    ).roles.highest;
    const targetRole = target.roles.highest;

    if (executorRole.comparePositionTo(targetRole) < 0) {
        return;
    }

    if (executorRole.comparePositionTo(targetRole) <= 0 || !executorCanBan) {
        await channel.send(
            'You do not have sufficient permission to execute this command.'
        );
        return;
    }

    if (clientRole.comparePositionTo(targetRole) <= 0) {
        await channel.send(
            'I do not have sufficient permission to execute this command.'
        );
        return;
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
