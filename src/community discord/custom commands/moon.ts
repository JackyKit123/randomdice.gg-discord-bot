import * as Discord from 'discord.js';
import { promisify } from 'util';

const wait = promisify(setTimeout);

export default async function custom(
    client: Discord.Client,
    message: Discord.Message
): Promise<void> {
    const { content, author, guild, channel } = message;

    if (!guild) {
        return;
    }

    const [command, arg] = content.split(' ');

    if (command === '!moon' && author.id === '722951439567290458') {
        const target = guild.members.cache.find(
            m =>
                m.user.id === arg ||
                m.nickname === arg ||
                m.user.username === arg ||
                `${m.user.username}#${m.user.discriminator}` === arg ||
                m.user.id === arg?.match(/<@!?(\d{18})>/)?.[1]
        );
        if (!target) {
            await channel.send(
                `Usage of the command: \`\`\`${command} <@mention | user id | username>\`\`\``
            );
            return;
        }
        const clientRole = (guild.member(
            (client.user as Discord.ClientUser).id
        ) as Discord.GuildMember).roles.highest;
        const targetRole = target.roles.highest;
        if (clientRole.comparePositionTo(targetRole) <= 0) {
            await channel.send(
                `I am not high enough in the role hierarchy to \`moon\` this member.`
            );
            return;
        }
        const originalName = target.displayName;
        const randomMoonEmoji = [
            '🌝',
            '🌕',
            '🌗',
            '🌘',
            '🌖',
            '🌙',
            '🌛',
            '🌚',
            '🌑',
            '🌓',
            '🌒',
            '🌔',
            '☪',
            '☾',
            '☽',
        ][Math.floor(Math.random() * 15)];
        const sentMessage = await channel.send(`${target.toString()}...🌚`);
        await wait(500);
        await sentMessage.edit(`${target.toString()}...🌘`);
        await wait(500);
        await sentMessage.edit(`${target.toString()}...🌗`);
        await wait(500);
        await sentMessage.edit(`${target.toString()}...🌗`);
        await wait(500);
        await sentMessage.edit(`${target.toString()}...🌖`);
        await wait(500);
        await sentMessage.edit(`${target.toString()}...🌝`);
        await wait(500);
        await Promise.all([
            sentMessage.edit(
                `${target.toString()}...You have been mooned! <a:Taxi:780350572212781086>`
            ),
            target.setNickname(
                originalName.length >= 30
                    ? `${originalName.slice(0, 29)}…${randomMoonEmoji}`
                    : `${originalName}${randomMoonEmoji}`
            ),
            target.roles.add('804508975503638558'),
        ]);
        await wait(1000 * 60 * 5);
        try {
            await Promise.all([
                target.setNickname(originalName),
                target.roles.remove('804508975503638558'),
            ]);
        } catch (err) {
            // suppress error
        }
    }
}
