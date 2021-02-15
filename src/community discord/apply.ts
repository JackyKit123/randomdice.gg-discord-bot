import * as Discord from 'discord.js';
import * as firebase from 'firebase-admin';
import cache from '../helper/cache';
import cooldown from '../helper/cooldown';

export default async function Apply(message: Discord.Message): Promise<void> {
    const { member, channel, guild, content, deletable } = message;

    if (!member || !guild) {
        return;
    }

    const [, ...args] = content.split(' ');

    if (
        await cooldown(message, '!apply', {
            default: 1000 * 60 * 10,
            donator: 1000 * 60 * 10,
        })
    ) {
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
            openedApplications.map(app => `\`${app.position}\``).join('\n') ||
                '*none*'
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

export async function configApps(message: Discord.Message): Promise<void> {
    const { member, guild, content, channel } = message;

    const [, subcommand, ...args] = content.split(' ');
    const [position, arg] = args
        ?.join(' ')
        .split('|')
        .map(e => e.trim());
    const database = firebase.database();
    const ref = database.ref('discord_bot/community/applications');
    const existingApplications = cache['discord_bot/community/applications'];

    if (!member || !guild) {
        return;
    }

    if (
        await cooldown(message, '!application', {
            default: 5 * 1000,
            donator: 5 * 1000,
        })
    ) {
        return;
    }

    if (!member.hasPermission('ADMINISTRATOR')) {
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('Command Parse Error')
                .setColor('#ff0000')
                .setDescription(
                    'You need `ADMINISTRATOR` permission to use this command.'
                )
        );
    }

    switch (subcommand?.toLowerCase()) {
        case 'add':
            {
                if (
                    existingApplications.find(
                        app =>
                            app.position.toLowerCase() ===
                            position.toLowerCase()
                    )
                ) {
                    await channel.send(
                        `Application for ${position} already exist, use \`edit\` to edit the questions instead`
                    );
                    return;
                }
                let applicationEmbed = new Discord.MessageEmbed()
                    .setTitle(`${position} Application`)
                    .setColor(member.displayHexColor)
                    .setAuthor(
                        `${member.user.username}#${member.user.discriminator}`,
                        member.user.displayAvatarURL({ dynamic: true })
                    )
                    .setFooter(
                        'React to ✅ when finished, react to ❌ to cancel your application.'
                    )
                    .setTimestamp();
                arg?.split('\n').forEach((question, i) => {
                    applicationEmbed = applicationEmbed.addField(
                        `Question ${i + 1}`,
                        question
                    );
                });
                const applicationMessage = await channel.send(
                    `${member} Here's a preview of how the application would look like, react to ✅ in 1 minute to confirm, react to ❌ to cancel`,
                    applicationEmbed
                );
                await applicationMessage.react('✅');
                await applicationMessage.react('❌');
                try {
                    const collector = applicationMessage.createReactionCollector(
                        (
                            reaction: Discord.MessageReaction,
                            user: Discord.User
                        ) =>
                            (reaction.emoji.name === '✅' ||
                                reaction.emoji.name === '❌') &&
                            user.id === member.id,
                        {
                            time: 60 * 1000,
                        }
                    );
                    collector.on('collect', async collection => {
                        if (collection.emoji.name === '✅') {
                            collector.stop();
                            await ref.set(
                                existingApplications.concat({
                                    isOpen: true,
                                    position,
                                    questions: arg.split('\n'),
                                })
                            );
                            await channel.send(
                                `Added ${position} application and it's opened for application.`
                            );
                        }
                        if (collection.emoji.name === '❌') {
                            try {
                                collector.stop();
                                await applicationMessage.delete();
                                await channel.send('Cancel request.');
                            } finally {
                                //
                            }
                        }
                    });
                } catch {
                    try {
                        await applicationMessage.delete();
                    } finally {
                        await channel.send('You did not react in time.');
                    }
                }
            }
            break;
        case 'edit':
            {
                if (
                    !existingApplications.find(
                        app =>
                            app.position.toLowerCase() ===
                            position.toLowerCase()
                    )
                ) {
                    await channel.send(
                        `Application for ${position} does not exist, use \`add\` to add a new application.`
                    );
                    return;
                }
                let applicationEmbed = new Discord.MessageEmbed()
                    .setTitle(`${position} Application`)
                    .setColor(member.displayHexColor)
                    .setAuthor(
                        `${member.user.username}#${member.user.discriminator}`,
                        member.user.displayAvatarURL({ dynamic: true })
                    )
                    .setFooter(
                        'React to ✅ when finished, react to ❌ to cancel your application.'
                    )
                    .setTimestamp();
                arg?.split('\n').forEach((question, i) => {
                    applicationEmbed = applicationEmbed.addField(
                        `Question ${i + 1}`,
                        question
                    );
                });
                const applicationMessage = await channel.send(
                    `${member} Here's a preview of how the application would look like, react to ✅ in 1 minute to confirm, react to ❌ to cancel`,
                    applicationEmbed
                );
                await applicationMessage.react('✅');
                await applicationMessage.react('❌');
                try {
                    const collector = applicationMessage.createReactionCollector(
                        (
                            reaction: Discord.MessageReaction,
                            user: Discord.User
                        ) =>
                            (reaction.emoji.name === '✅' ||
                                reaction.emoji.name === '❌') &&
                            user.id === member.id,
                        {
                            time: 60 * 1000,
                        }
                    );
                    collector.on('collect', async collection => {
                        if (collection.emoji.name === '✅') {
                            collector.stop();
                            await ref.set(
                                existingApplications.map(app => {
                                    if (
                                        app.position.toLowerCase() ===
                                        position.toLowerCase()
                                    ) {
                                        // eslint-disable-next-line no-param-reassign
                                        app.questions = arg.split('\n');
                                    }
                                    return app;
                                })
                            );
                            await channel.send(
                                `Edited ${position} application.`
                            );
                        }
                        if (collection.emoji.name === '❌') {
                            try {
                                collector.stop();
                                await applicationMessage.delete();
                                await channel.send('Cancel request.');
                            } finally {
                                //
                            }
                        }
                    });
                } catch {
                    try {
                        await applicationMessage.delete();
                    } finally {
                        await channel.send('You did not react in time.');
                    }
                }
            }
            break;
        case 'delete':
            {
                const target = existingApplications.find(
                    app => app.position.toLowerCase() === position.toLowerCase()
                );
                if (!target) {
                    await channel.send(
                        `Application for ${position} does not exist.`
                    );
                    return;
                }
                let applicationEmbed = new Discord.MessageEmbed()
                    .setTitle(`${target.position} Application`)
                    .setColor(member.displayHexColor)
                    .setAuthor(
                        `${member.user.username}#${member.user.discriminator}`,
                        member.user.displayAvatarURL({ dynamic: true })
                    )
                    .setFooter(
                        'React to ✅ when finished, react to ❌ to cancel your application.'
                    )
                    .setTimestamp();
                target.questions.forEach((question, i) => {
                    applicationEmbed = applicationEmbed.addField(
                        `Question ${i + 1}`,
                        question
                    );
                });
                const applicationMessage = await channel.send(
                    `${member} You are about to delete this application, react to ✅ in 1 minute to confirm delete, react to ❌ to cancel`,
                    applicationEmbed
                );
                await applicationMessage.react('✅');
                await applicationMessage.react('❌');
                try {
                    const collector = applicationMessage.createReactionCollector(
                        (
                            reaction: Discord.MessageReaction,
                            user: Discord.User
                        ) =>
                            (reaction.emoji.name === '✅' ||
                                reaction.emoji.name === '❌') &&
                            user.id === member.id,
                        {
                            time: 60 * 1000,
                        }
                    );
                    collector.on('collect', async collection => {
                        if (collection.emoji.name === '✅') {
                            collector.stop();
                            await ref.set(
                                existingApplications.filter(
                                    app =>
                                        app.position.toLowerCase() !==
                                        position.toLowerCase()
                                )
                            );
                            await channel.send(
                                `Removed ${position} application.`
                            );
                        }
                        if (collection.emoji.name === '❌') {
                            try {
                                collector.stop();
                                await applicationMessage.delete();
                                await channel.send('Cancel request.');
                            } finally {
                                //
                            }
                        }
                    });
                } catch {
                    try {
                        await applicationMessage.delete();
                    } finally {
                        await channel.send('You did not react in time.');
                    }
                }
            }
            break;
        case 'toggle':
            {
                const target = existingApplications.find(
                    app => app.position.toLowerCase() === position.toLowerCase()
                );
                if (!target) {
                    await channel.send(
                        `Application for ${position} does not exist.`
                    );
                    return;
                }
                await ref.set(
                    existingApplications.map(app => {
                        if (
                            app.position.toLowerCase() ===
                            position.toLowerCase()
                        ) {
                            // eslint-disable-next-line no-param-reassign
                            app.isOpen = !app.isOpen;
                        }
                        return app;
                    })
                );
                await channel.send(
                    `Application for ${position} is now ${
                        target.isOpen ? 'opened' : 'closed'
                    }.`
                );
            }
            break;
        case 'show':
            {
                const target = existingApplications.find(
                    app => app.position.toLowerCase() === position.toLowerCase()
                );
                if (!target) {
                    await channel.send(
                        new Discord.MessageEmbed()
                            .setTitle(`All Applications`)
                            .setColor(member.displayHexColor)
                            .setAuthor(
                                `${member.user.username}#${member.user.discriminator}`,
                                member.user.displayAvatarURL({ dynamic: true })
                            )
                            .setDescription(
                                existingApplications
                                    .map(
                                        app =>
                                            `${
                                                app.isOpen ? 'opened' : 'closed'
                                            } \`${app.position}\``
                                    )
                                    .join('\n')
                            )
                    );
                } else {
                    let applicationEmbed = new Discord.MessageEmbed()
                        .setTitle(`${target.position} Application`)
                        .setColor(member.displayHexColor)
                        .setAuthor(
                            `${member.user.username}#${member.user.discriminator}`,
                            member.user.displayAvatarURL({ dynamic: true })
                        )
                        .setFooter(
                            `Application publicity: ${
                                target.isOpen ? 'opened' : 'closed'
                            } for application`
                        )
                        .setTimestamp();
                    target.questions.forEach((question, i) => {
                        applicationEmbed = applicationEmbed.addField(
                            `Question ${i + 1}`,
                            question
                        );
                    });
                    await channel.send(applicationEmbed);
                }
            }
            break;
        default:
            await channel.send(
                new Discord.MessageEmbed()
                    .setTitle('Command Parse Error')
                    .setColor('#ff0000')
                    .setDescription('usage of the command')
                    .addField(
                        'Adding new application',
                        '`!application add <position> | <questions separated with linebreaks>`' +
                            '\n' +
                            'Example```!application add ADMIN | Why do you want to be admin?\nHow will you do your admin task?\nHow active are you?```'
                    )
                    .addField(
                        'Editing existing application',
                        '`!application edit <position> | <questions separated with linebreaks>`' +
                            '\n' +
                            'Example```!application edit ADMIN | Why do you want to be admin?\nHow will you do your admin task?\nHow active are you?```'
                    )
                    .addField(
                        'Deleting existing application',
                        '`!application delete <position>`' +
                            '\n' +
                            'Example```!application delete ADMIN```'
                    )
                    .addField(
                        'Toggling accepting new applications',
                        '`!application toggle <position>`' +
                            '\n' +
                            'Example```!application toggle ADMIN```'
                    )
                    .addField(
                        'Showing stored applications',
                        '`!application show [position]`' +
                            '\n' +
                            'Example```!application show\n!application show ADMIN```'
                    )
            );
    }
}
