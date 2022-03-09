import { timeDice } from 'config/emojiId';
import {
    ApplicationCommandData,
    Client,
    CommandInteraction,
    DiscordAPIError,
    Guild,
    GuildMember,
    Message,
    MessageEmbed,
    TextBasedChannel,
} from 'discord.js';
import { database } from 'register/firebase';
import { promisify } from 'util';
import cache from 'util/cache';
import parseMsIntoReadableText, { parseStringIntoMs } from 'util/parseMS';

const wait = promisify(setTimeout);

async function killTimerFromDB(timerKey: string): Promise<void> {
    try {
        await database
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
                        i + 1 === arr.length ? Math.round(Number(match)) : match
                    }** `
            )
        )
        .join(' ')}__`;
}

function tickTimer(
    message: Message,
    hostId: string,
    endTime: number,
    key: string
): void {
    const { embeds, channel, reactions, guild, id } = message;
    const embed = embeds?.[0];
    if (!embed || !cache['discord_bot/community/timer'][key]) {
        killTimerFromDB(key);
        return;
    }
    const tick = async () => {
        const now = Date.now();
        try {
            if (now <= endTime) {
                const newText = parseTimeText(endTime - now);
                if (newText !== embed.description) {
                    await message.edit({
                        embeds: [embed.setDescription(newText)],
                    });
                }
                await wait(5000);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                tick();
            } else {
                killTimerFromDB(key);
                await message.edit({
                    embeds: [embed.setDescription('**Timer Ended**')],
                });
                const timerReact = reactions.cache.find(
                    reaction => reaction.emoji.identifier === timeDice
                );
                const userList = (await timerReact?.users.fetch())
                    ?.filter(user => !user.bot && user.id !== hostId)
                    .map(user => user.toString())
                    .join(' ');
                let originalMessage: Message | undefined;
                try {
                    originalMessage = await channel.messages.fetch(id);
                } catch (err) {
                    if (
                        (err as DiscordAPIError).message !== 'Unknown Message'
                    ) {
                        throw err;
                    }
                }

                const messageOption = {
                    content: `<@${hostId}> ${
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
                    embeds: [
                        new MessageEmbed().setDescription(
                            `The [timer](https://discord.com/channels/${
                                (guild as Guild).id
                            }/${channel.id}/${id})${
                                embed.title ? ` for **${embed.title}**` : ''
                            } has ended.`
                        ),
                    ],
                };
                if (originalMessage) {
                    await originalMessage.reply(messageOption);
                } else {
                    await channel.send(messageOption);
                }
            }
        } catch (err) {
            killTimerFromDB(key);
            if ((err as DiscordAPIError).message !== 'Unknown Message')
                throw new Error((err as DiscordAPIError).message);
        }
    };
    tick();
}

export async function setTimer(
    channel: TextBasedChannel,
    member: GuildMember,
    title: string,
    time: number
): Promise<void> {
    const endTime = Date.now() + time;

    const timerMessage = await channel.send({
        embeds: [
            new MessageEmbed()
                .setAuthor({
                    name: `${member.displayName}'s Timer`,
                    iconURL: member.displayAvatarURL({ dynamic: true }),
                })
                .setTitle(title)
                .setColor(member.displayHexColor)
                .setFooter({
                    text: 'Timer ends at',
                    iconURL:
                        'https://cdn.discordapp.com/emojis/804524690440847381.png?v=1',
                })
                .setTimestamp(endTime)
                .setDescription(parseTimeText(time)),
        ],
    });
    const ref = database.ref('discord_bot/community/timer').push();
    await ref.set({
        guildId: member.guild.id,
        channelId: channel.id,
        messageId: timerMessage.id,
        hostId: member.id,
        endTime,
    });
    tickTimer(timerMessage, member.id, endTime, ref.key as string);
    await timerMessage.react(timeDice);
}

export default async function timerCommand(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { guild, member, channel } = interaction;

    if (!channel) return;

    if (interaction.options.getSubcommand(true) === 'cancel') {
        const timerId = interaction.options.getString('message-id', true);
        const existingTimer = Object.entries(
            cache['discord_bot/community/timer']
        ).find(([, timer]) => timer.messageId === timerId);
        if (!existingTimer) {
            await interaction.reply('No active timer found.');
            return;
        }
        const [key, timer] = existingTimer;
        const timerChannel = guild.channels.cache.get(timer.channelId);
        if (!timerChannel?.isText()) {
            await interaction.reply('No active timer found.');
            return;
        }
        if (
            !timerChannel.permissionsFor(member)?.has('MANAGE_MESSAGES') &&
            existingTimer?.[1].hostId !== member.id
        ) {
            await interaction.reply(
                `You do not have permission to end that timer. You need to either be the one started that timer or have \`MANAGE_MESSAGE\` permission in <#${timer.channelId}>`
            );
            return;
        }
        killTimerFromDB(key);
        try {
            const existingTimerMessage = await timerChannel.messages.fetch(
                timerId
            );
            await existingTimerMessage.delete();
        } catch (err) {
            if ((err as DiscordAPIError).message !== 'Unknown Message') {
                throw err;
            }
        }
        await interaction.reply('Killed timer.');
        return;
    }

    const time = parseStringIntoMs(interaction.options.getString('time', true));
    const msg =
        interaction.options.getString('title') ??
        `${member.displayName}'s Timer`;

    if (!time) {
        await interaction.reply(
            'Invalid time string. Time string should be like `1d2h3m4s`'
        );
        return;
    }
    await interaction.deferReply();
    await setTimer(channel, member, msg, time);
    await interaction.deleteReply();
}

export async function registerTimer(client: Client): Promise<void> {
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

            tickTimer(message, timer.hostId, timer.endTime, key);
        } catch (err) {
            killTimerFromDB(key);
        }
    });
}

export async function hackwarnTimer(
    message: Message | CommandInteraction
): Promise<void> {
    if (message instanceof CommandInteraction) return;
    const { guild, channel, member } = message;

    if (!guild || !member) return;

    const carlBotRespond = await channel.awaitMessages({
        max: 1,
        filter: m =>
            /^\*\*.+#\d{4}\*\* has been warned, this is their [\w\d]+ warning\.$/.test(
                m.content
            ) && m.author.id === '235148962103951360',
    });

    const warnConfirmation = carlBotRespond.first();

    if (!warnConfirmation) return;

    const target = warnConfirmation.content.match(
        /^\*\*(.+#\d{4})\*\* has been warned, this is their [\w\d]+ warning\.$/
    )?.[1];

    await setTimer(
        channel,
        member,
        `Ban ${target ?? 'this member'} in 24 hours.`,
        1000 * 60 * 60 * 24
    );
}

export const commandData: ApplicationCommandData = {
    name: 'timer',
    description: 'timer',
    options: [
        {
            name: 'set',
            description: 'Set a timer',
            type: 1,
            options: [
                {
                    name: 'time',
                    description: 'The time string to set the timer for',
                    required: true,
                    type: 3,
                },
                {
                    name: 'title',
                    description: 'The title of the timer',
                    type: 3,
                },
            ],
        },
        {
            name: 'cancel',
            description: 'Cancel a timer',
            type: 1,
            options: [
                {
                    name: 'message-id',
                    description: 'The message id of the timer to cancel',
                    required: true,
                    type: 3,
                },
            ],
        },
    ],
};
