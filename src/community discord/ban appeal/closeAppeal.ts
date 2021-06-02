import * as Discord from 'discord.js';
import cooldown from '../../util/cooldown';

export default async function closeAppeal(
    message: Discord.Message
): Promise<void> {
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
        await channel.send(
            'Error: Missing `COMMUNITY_SERVER_ID` env in bot code, please contact an admin.'
        );
        return;
    }

    const accept = async (target: Discord.GuildMember): Promise<void> => {
        try {
            (await client.guilds.fetch(COMMUNITY_SERVER_ID)).members.unban(
                target,
                'Appealed accepted in appeal server.'
            );
        } finally {
            try {
                await target.send(
                    'Your appeal is accepted, you may now return to this main server. https://discord.gg/ZrXRpZq2mq'
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

    const reject = async (target: Discord.GuildMember): Promise<void> => {
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

    const falsebanned = async (target: Discord.GuildMember): Promise<void> => {
        try {
            (await client.guilds.fetch(COMMUNITY_SERVER_ID)).members.unban(
                target,
                'Appealed accepted in appeal server, member is not guilty.'
            );
        } finally {
            try {
                await target.send(
                    'Your appeal is accepted, you are found to be clean, you may now return to this main server. https://discord.gg/ZrXRpZq2mq'
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

    const target = (guild as Discord.Guild).members.cache.find(
        m =>
            m.user.id === arg ||
            m.user.id === arg.match(/<@!?(\d{18})>/)?.[1] ||
            `${m.user.username}#${m.user.discriminator}` ===
                arg.toLowerCase() ||
            m.user.username === arg.toLowerCase() ||
            m.nickname === arg.toLowerCase()
    );
    if (!target) {
        await channel.send(
            `Usage of the command: \`\`\`${command} <@mention | user id | username>\`\`\``
        );
        return;
    }
    const executorRole = member.roles.highest;
    const executorCanBan = member.hasPermission('BAN_MEMBERS');
    const clientRole = (guild.member(
        (client.user as Discord.ClientUser).id
    ) as Discord.GuildMember).roles.highest;
    const targetRole = target.roles.highest;

    if (executorRole.comparePositionTo(targetRole) < 0) {
        return;
    }

    if (
        executorRole.comparePositionTo(targetRole) <= 0 ||
        !executorCanBan ||
        clientRole.comparePositionTo(targetRole) <= 0
    ) {
        await channel.send(
            `I cannot close an appeal ticket on **${target.user.username}#${target.user.discriminator}** for you.`
        );
        return;
    }

    let archiveCat = guild.channels.cache.find(
        chl => /archives/i.test(chl.name) && chl.type === 'category'
    )?.id;

    if (
        !archiveCat ||
        (guild.channels.cache.get(archiveCat) as Discord.CategoryChannel)
            .children.size >= 50
    ) {
        archiveCat = (
            await guild.channels.create('Archives', {
                type: 'category',
                position: -1,
            })
        ).id;
    }

    (channel as Discord.TextChannel).setParent(archiveCat);

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
