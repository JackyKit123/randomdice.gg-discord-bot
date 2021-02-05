import * as Discord from 'discord.js';
import cache from '../helper/cache';

export default async function Apply(message: Discord.Message): Promise<void> {
    const { member, channel, guild, content, deletable } = message;

    if (!member || !guild) {
        return;
    }

    const [command, ...args] = content.split(' ');

    if (command !== '!apply') {
        return;
    }
    try {
        if (deletable) await message.delete();
    } catch {
        // suppress error;
    }
    const applications = cache['discord_bot/community/applications'];
    const openedApplications = applications.filter(app => app.isOpen);
    const openedApplicationsEmbed = new Discord.MessageEmbed()
        .setTitle('Command Parse Error')
        .setColor('#ff0000')
        .addField(
            'Opened Applications',
            openedApplications.map(app => `\`${app.position}\``).join('\n')
        )
        .setFooter(`Opened Application Count: ${openedApplications.length}`);
    if (!args.join(' ')) {
        await channel.send(
            openedApplicationsEmbed.setDescription(
                `Please specify an application you are applying for.\`\`\`!apply <position>\`\`\``
            )
        );
        return;
    }

    const application = applications.find(
        app => args.join(' ').toLowerCase() === app.position.toLowerCase()
    );

    if (!application) {
        await channel.send(
            openedApplicationsEmbed.setDescription(
                `\`${args.join(' ')}\` is not a currently opened application.`
            )
        );
        return;
    }

    const newChannel = await guild.channels.create(
        `${member.user.username}-${member.user.discriminator}-${application.position}-application`,
        {
            parent: guild.channels.cache.get('807183574645735474'),
            reason: 'Member Application',
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: ['VIEW_CHANNEL'],
                },
                {
                    id: member,
                    allow: ['VIEW_CHANNEL'],
                },
            ],
        }
    );
    let applicationEmbed = new Discord.MessageEmbed()
        .setTitle(`${application.position} Application`)
        .setColor(member.displayHexColor)
        .setAuthor(
            `${member.user.username}#${member.user.discriminator}`,
            member.user.displayAvatarURL({ dynamic: true })
        )
        .setFooter(
            'React to ✅ when finished, react to ❌ to cancel your application.'
        )
        .setTimestamp();
    application.questions.forEach((question, i) => {
        applicationEmbed = applicationEmbed.addField(
            `Question ${i + 1}`,
            question
        );
    });
    const applicationMessage = await newChannel.send(
        member.toString(),
        applicationEmbed
    );
    await applicationMessage.react('✅');
    await applicationMessage.react('❌');
}

export async function closeApplication(
    reaction: Discord.MessageReaction,
    user: Discord.User | Discord.PartialUser,
    clientUserId: string
): Promise<void> {
    const { message } = reaction;
    const { channel, author, embeds, guild } = message;

    if (!guild || guild.id !== process.env.COMMUNITY_SERVER_ID) {
        return;
    }

    const applicationName = embeds.find(embed =>
        embed.title?.endsWith(' Application')
    )?.title;
    if (
        !(channel as Discord.TextChannel).name.match(
            /^.{2,32}-\d{4}-.+-application$/
        ) ||
        author.id !== clientUserId ||
        !applicationName
    ) {
        return;
    }

    const memberId = (channel as Discord.TextChannel).permissionOverwrites.find(
        overwrite => overwrite.type === 'member'
    )?.id;

    if (!memberId || memberId !== user.id) {
        return;
    }

    if (reaction.emoji.name === '✅') {
        await channel.send(
            '✅ Please type `submit` to confirm your submission and notify the Admins.\n⚠️ Warning, once you confirm submit, the channel will be locked down and admins will be pinged to review your application, you cannot send new messages here anymore.'
        );
        try {
            const awaitedMessage = await channel.awaitMessages(
                (newMessage: Discord.Message) =>
                    newMessage.author.id === user.id &&
                    newMessage.content.toLowerCase() === 'submit',
                { time: 60000, max: 1, errors: ['time'] }
            );
            if (awaitedMessage.first()?.content.toLowerCase() === 'submit') {
                await (channel as Discord.TextChannel).updateOverwrite(
                    guild.roles.everyone,
                    {
                        SEND_MESSAGES: false,
                    },
                    'Application Submit'
                );
                await message.reactions.removeAll();
                await channel.send(`Locked down ${channel}`);
                await channel.send(
                    `<@&804223328709115944>, ${user} has submitted the ${applicationName.toLowerCase()}.`
                );
            }
        } catch {
            await channel.send("You didn't say `submit` in time.");
            await reaction.users.remove(user.id);
        }
    }
    if (reaction.emoji.name === '❌') {
        await channel.send(
            '❌ Please type `cancel` to cancel your application.\n⚠️ Warning, once you confirm cancel, the channel will be deleted, this action cannot be undone.'
        );
        try {
            const awaitedMessage = await channel.awaitMessages(
                (newMessage: Discord.Message) =>
                    newMessage.author.id === user.id &&
                    newMessage.content.toLowerCase() === 'cancel',
                { time: 60000, max: 1, errors: ['time'] }
            );
            if (awaitedMessage.first()?.content.toLowerCase() === 'cancel') {
                await channel.delete('Cancel Application');
            }
        } catch {
            await channel.send("You didn't say `cancel` in time.");
            await reaction.users.remove(user.id);
        }
    }
}

export async function fetchApps(client: Discord.Client): Promise<void> {
    const guild = await client.guilds.fetch(
        process.env.COMMUNITY_SERVER_ID as string
    );
    const applications = guild.channels.cache.get('807183574645735474');
    if (applications?.type === 'category') {
        (applications as Discord.CategoryChannel).children.forEach(
            async child => {
                if (child.type === 'text') {
                    await (child as Discord.TextChannel).messages.fetch(
                        { limit: 100 },
                        true
                    );
                }
            }
        );
    }
}
