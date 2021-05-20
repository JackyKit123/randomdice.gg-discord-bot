import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import cache from '../helper/cache';
import parseMsIntoReadableText, { parseStringIntoMs } from '../helper/parseMS';

async function killTimerFromDB(timerKey: string): Promise<void> {
    try {
        admin
            .database()
            .ref('discord_bot/community/timer')
            .child(timerKey)
            .set(null);
    } catch (err) {
        // silent
    }
}

function parseTimeText(time: number): string {
    return `__${parseMsIntoReadableText(time, true)
        .split(' ')
        .slice(0, 3)
        .map(timeString =>
            timeString.replace(
                /\d{0,2}(?:\.\d)?/,
                (match, i, arr) =>
                    `**${
                        i === arr.length ? Math.round(Number(match)) : match
                    }** `
            )
        )
        .join(' ')}__`;
}

function tickTimer(
    message: Discord.Message,
    endTime: number,
    key: string
): void {
    const { embeds, channel, author, reactions, guild, id, edit } = message;
    const embed = embeds?.[0];
    try {
        if (!embed) throw new Error();
        const interval = setInterval(async () => {
            const now = Date.now();
            if (now <= endTime) {
                const newText = parseTimeText(endTime - now);
                if (newText !== embed.description) {
                    await edit(embed.setDescription(newText));
                }
            } else {
                await edit(embed.setDescription('**Timer Ended**'));
                clearInterval(interval);
                killTimerFromDB(key);
                const timerReact = reactions.cache.find(
                    reaction => reaction.emoji.id === '804524690440847381'
                );
                const userList = (await timerReact?.users.fetch())
                    ?.filter(user => !user.bot && user.id !== author.id)
                    .map(user => user.toString())
                    .join(' ');
                await channel.send(
                    `${author} ${
                        // eslint-disable-next-line no-nested-ternary
                        userList
                            ? userList.length < 2048
                                ? userList
                                : `Too many user reacted to the timer, cannot ping everyone.\n${userList.slice(
                                      0,
                                      89
                                  )}`
                            : ''
                    }`,
                    new Discord.MessageEmbed().setDescription(
                        `The [timer](https://discord.com/channels/${
                            (guild as Discord.Guild).id
                        }/${channel.id}/${id}) for **${
                            embed.title || '"no title"'
                        }** has ended.`
                    )
                );
            }
        }, 5 * 1000);
    } catch {
        killTimerFromDB(key);
    }
}

export default async function setTimer(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { guild, content, member, channel } = message;
    const [, timeArg, ...messageArr] = content.split(' ');
    const time = parseStringIntoMs(timeArg);
    const msg = messageArr.join(' ');

    if (!member || !guild) {
        return;
    }

    if (!time) {
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('Command Parse Error')
                .setColor('#ff0000')
                .setDescription('usage of the command')
                .addField(
                    `!timer <time> [message]`,
                    'Example:```!timer 20s Just a countdown\n!timer 4d20m smoke weed everyday```'
                )
        );
        return;
    }
    const endTime = Date.now() + time;

    const timerMessage = await channel.send(
        new Discord.MessageEmbed()
            .setAuthor(
                `Timer by ${member.displayName}`,
                member.user.displayAvatarURL(
                    { dynamic: true } ?? member.user.defaultAvatarURL
                )
            )
            .setTitle(msg)
            .setColor(member.displayHexColor)
            .setFooter(
                'Timer ends at',
                'https://cdn.discordapp.com/emojis/804524690440847381.png?v=1'
            )
            .setTimestamp(endTime)
            .setDescription(parseTimeText(time))
    );
    const ref = database.ref('discord_bot/community/timer').push();
    await ref.set({
        guildId: guild.id,
        channelId: channel.id,
        messageId: timerMessage.id,
        endTime,
    });
    tickTimer(timerMessage, endTime, ref.key as string);
    await timerMessage.react('<:Dice_Tier4_Time:804524690440847381>');
}

export async function registerTimer(client: Discord.Client): Promise<void> {
    const data = cache['discord_bot/community/timer'];
    Object.entries(data || {}).forEach(async ([key, timer]) => {
        try {
            const guild = await client.guilds.fetch(timer.guildId);
            if (!guild) {
                killTimerFromDB(key);
                return;
            }

            const channel = guild.channels.cache.get(timer.channelId);
            if (!channel?.isText()) {
                killTimerFromDB(key);
                return;
            }

            const message = await channel.messages.fetch(timer.messageId);
            if (!message) {
                killTimerFromDB(key);
                return;
            }

            tickTimer(message, timer.endTime, key);
        } catch (err) {
            killTimerFromDB(key);
        }
    });
}
