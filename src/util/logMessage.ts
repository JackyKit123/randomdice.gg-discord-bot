/* eslint-disable no-console */
import getBrandingEmbed from 'commands/util/getBrandingEmbed';
import {
    AnyChannel,
    Client,
    Guild,
    GuildBan,
    GuildMember,
    Interaction,
    Message,
    MessageEmbed,
    MessageReaction,
    PartialMessage,
    PartialMessageReaction,
    PartialUser,
    Typing,
    User,
    WebhookClient,
} from 'discord.js';
import reboot from 'dev-commands/reboot';
import { devUsersMentions } from 'config/users';
import { devTestServerChannelId } from 'config/channelIds';
import { getDevTestDiscord } from 'config/guild';

const getEmbed = (
    severity: 'info' | 'warning' | 'error',
    message: unknown
): MessageEmbed => {
    return getBrandingEmbed()
        .setDescription(
            message instanceof Error
                ? message.stack ?? message.message
                : String(message)
        )
        .setTitle(`${severity[0].toUpperCase()}${severity.slice(1)}`)
        .setColor(
            // eslint-disable-next-line no-nested-ternary
            severity === 'error'
                ? 0xcc0000
                : severity === 'warning'
                ? 0xcccc00
                : 0x00cc00
        )
        .setAuthor(null)
        .setFooter({
            text: `env: ${process.env.NODE_ENV}`,
        });
};

// eslint-disable-next-line consistent-return
export default async function log(
    client: Client,
    severity: 'info' | 'warning' | 'error',
    message: unknown = ''
): Promise<Message | ReturnType<WebhookClient['send']>> {
    const messageOption = {
        content: severity === 'error' ? devUsersMentions : undefined,
        embeds:
            message instanceof MessageEmbed
                ? [message]
                : [getEmbed(severity, message)],
    };

    const webhookLogging = new WebhookClient({
        id: '48731927232397312',
        token: process.env.DEV_SERVER_LOG_CHANNEL_WEBHOOK_TOKEN ?? '',
    });

    try {
        const logChannel = getDevTestDiscord(client).channels.cache.get(
            devTestServerChannelId['bot-log']
        );
        return logChannel?.isText()
            ? logChannel.send(messageOption)
            : webhookLogging.send({
                  ...messageOption,
                  content: `${messageOption.content}\n⚠️This is logged with webhook, please check if the channel property is sufficiently supplied.`,
              });
    } catch (networkError) {
        try {
            return webhookLogging.send({
                content: `⚠️⚠️⚠️⚠️⚠️\n${devUsersMentions}\nNormal logging has failed. This message is being sent using the webhook instead.\n⚠️⚠️⚠️⚠️⚠️`,
                embeds: [
                    new MessageEmbed()
                        .setColor('#ff0000')
                        .setTitle('Critical Error Encountered')
                        .setDescription(
                            (networkError as Error).stack ??
                                (networkError as Error).message ??
                                String(networkError)
                        )
                        .setFooter({
                            text: `env: ${process.env.NODE_ENV}`,
                        }),
                ],
            });
        } catch (criticalError) {
            // Even webhook logging failed. This is a critical error. Proceed to log to console.
            console.error(criticalError);

            // Critical error. Reboot the bot.
            try {
                client.destroy();
                await reboot();
            } catch (rebootError) {
                console.error(rebootError);
            } finally {
                process.exit(1);
            }
        }
    }
}

export async function logError(
    client: Client,
    error: unknown,
    origin: string,
    object?:
        | Interaction
        | Message
        | GuildBan
        | Guild
        | GuildMember
        | PartialMessage
        | MessageReaction
        | PartialMessageReaction
        | Client
        | Typing
): Promise<Message | ReturnType<WebhookClient['send']>> {
    let embed = getEmbed('warning', error);
    let user: User | PartialUser | null = null;
    let guild: Guild | null = null;
    let channel: AnyChannel | null = null;

    if (object instanceof Interaction) {
        user = object.user;
        guild = object.guild;
        channel = object.channel;
        if (object.isCommand() || object.isContextMenu()) {
            embed = embed.addField('Doing Command', object.commandName, true);
        }
        if (object.isMessageComponent()) {
            embed = embed.addField(
                `Message Component ${object.type}`,
                object.customId
            );
        }
    }
    if (object instanceof Message) {
        user = object.author;
        guild = object.guild;
        channel = object.channel;
        embed = embed.addField('In Message', object.content ?? 'no content');
    }
    if (object instanceof MessageReaction) {
        guild = object.message.guild;
        channel = object.message.channel;
        embed = embed.addField('In Reaction', object.emoji.toString());
    }
    if (object instanceof Client) {
        embed = embed.addField('In Client', '"Client"');
    }
    if (object instanceof Typing) {
        guild = object.guild;
        channel = object.channel;
        user = object.user;
        embed = embed.addField('In Typing', '"Typing"');
    }
    if (guild) {
        embed = embed.addField('In Guild', guild.name, true);
    }
    if (channel) {
        let name = '';
        if (channel.isVoice() || channel.isThread()) {
            name = channel.name;
        } else if (channel.isText()) {
            if (channel.type === 'DM') {
                name = 'DM Channel';
            } else {
                name = `#${channel.name}`;
            }
        } else {
            name = 'Unknown';
        }
        embed = embed.addField(
            `In ${channel.type} Channel`,
            `${name}\n${channel}`,
            true
        );
    }
    if (user) {
        embed = embed.addField('With User', `${user.tag}\n${user}`, true);
    }

    return log(client, 'warning', embed);
}
