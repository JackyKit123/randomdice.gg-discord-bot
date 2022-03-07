import roleIds from 'config/roleId';
import {
    ApplicationCommandData,
    ButtonInteraction,
    CategoryChannel,
    Client,
    CommandInteraction,
    DiscordAPIError,
    Message,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
    TextChannel,
} from 'discord.js';
import { argDependencies } from 'mathjs';
import { database } from 'register/firebase';
import cache, { CommunityDiscordApplication } from 'util/cache';
import cooldown from 'util/cooldown';
import { edit, reply } from 'util/typesafeReply';
import yesNoButton from 'util/yesNoButton';
import checkPermission from './util/checkPermissions';

export const commandData = (
    apps: CommunityDiscordApplication[]
): ApplicationCommandData[] => {
    const allPositions = apps.map(({ position }) => ({
        name: position,
        value: position,
    }));
    const openedPositionOptions = apps
        .filter(({ isOpen }) => isOpen)
        .map(({ position }) => ({
            name: position,
            value: position,
        }));

    const getPositionCommandData = (
        description: string,
        choices: typeof allPositions = [],
        required?: boolean
    ) => ({
        name: 'position',
        description,
        type: 3,
        required: required ?? choices.length > 0,
        choices,
    });

    const questionCommandData = {
        name: 'questions',
        description: 'the questions to ask, separate each question with |',
        type: 3,
        required: true,
    };
    return [
        {
            name: 'apply',
            description: 'start an application for a server position',
            options: [
                getPositionCommandData(
                    'the position you want to apply for',
                    openedPositionOptions,
                    true
                ),
            ],
            defaultPermission: openedPositionOptions.length > 0,
        },
        {
            name: 'application',
            description: 'manage applications',
            defaultPermission: false,
            options: [
                {
                    type: 1,
                    name: 'add',
                    description: 'add a new application',
                    options: [
                        getPositionCommandData(
                            'the name of the position to create',
                            [],
                            true
                        ),
                        questionCommandData,
                    ],
                },
                {
                    type: 1,
                    name: 'edit',
                    description: 'edit an existing application',
                    options: [
                        getPositionCommandData(
                            'the name of the position to edit',
                            allPositions,
                            true
                        ),
                        questionCommandData,
                    ],
                },
                {
                    type: 1,
                    name: 'delete',
                    description: 'delete an existing application',
                    options: [
                        getPositionCommandData(
                            'the name of the position to delete',
                            allPositions
                        ),
                    ],
                },
                {
                    type: 1,
                    name: 'toggle',
                    description: 'toggle accepting applications',
                    options: [
                        getPositionCommandData(
                            'the name of the position to toggle',
                            allPositions
                        ),
                    ],
                },
                {
                    type: 1,
                    name: 'show',
                    description:
                        'show all applications, or specific application',
                    options: [
                        getPositionCommandData(
                            'the name of the position to show',
                            allPositions,
                            false
                        ),
                    ],
                },
            ],
        },
    ];
};

export default async function Apply(
    input: Message | CommandInteraction
): Promise<void> {
    const { guild } = input;
    const member = guild?.members.cache.get(input.member?.user.id ?? '');

    if (!member || !guild) {
        return;
    }

    const arg =
        input instanceof Message
            ? input.content.split(' ').slice(1).join(' ')
            : input.options.getString('position');

    if (
        await cooldown(input, '!apply', {
            default: 1000 * 60 * 10,
            donator: 1000 * 60 * 10,
        })
    ) {
        return;
    }
    try {
        if (input instanceof Message) await input.delete();
    } catch (err) {
        if ((err as DiscordAPIError).message !== 'Unknown Message') throw err;
    }
    const applications = cache['discord_bot/community/applications'];
    const openedApplications = applications.filter(app => app.isOpen);
    const openedApplicationsEmbed = new MessageEmbed()
        .setTitle('Command Parse Error')
        .setColor('#ff0000')
        .addField(
            'Opened Applications',
            openedApplications.map(app => `\`${app.position}\``).join('\n') ||
                '*none*'
        )
        .setFooter({
            text: `Opened Application Count: ${openedApplications.length}`,
        });
    if (!arg) {
        await reply(input, {
            embeds: [
                openedApplicationsEmbed.setDescription(
                    `Please specify an application you are applying for.\`\`\`!apply <position>\`\`\``
                ),
            ],
        });
        return;
    }

    const application = applications.find(
        app => arg.toLowerCase() === app.position.toLowerCase() && app.isOpen
    );

    if (!application) {
        await reply(input, {
            embeds: [
                openedApplicationsEmbed.setDescription(
                    `\`${argDependencies}\` is not a currently opened application.`
                ),
            ],
        });
        return;
    }

    const applicationCategory = guild.channels.cache.get('807183574645735474');
    const newChannel = (await guild.channels.create(
        `${member.user.username}-${member.user.discriminator}-${application.position}-application`,
        {
            parent:
                applicationCategory instanceof CategoryChannel
                    ? applicationCategory
                    : undefined,
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
    )) as TextChannel;
    let applicationEmbed = new MessageEmbed()
        .setTitle(`${application.position} Application`)
        .setColor(member.displayHexColor)
        .setAuthor({
            name: member.user.tag,
            iconURL: member.displayAvatarURL({ dynamic: true }),
        })
        .setFooter({
            text: 'Click ✅ when finished, and ❌ to cancel your application.',
        })
        .setTimestamp();
    application.questions.forEach((question, i) => {
        applicationEmbed = applicationEmbed.addField(
            `Question ${i + 1}`,
            question
        );
    });
    await newChannel.send({
        content: member.toString(),
        embeds: [applicationEmbed],
        components: [
            new MessageActionRow().addComponents([
                new MessageButton()
                    .setCustomId('application-submit')
                    .setEmoji('✅')
                    .setLabel('Submit')
                    .setStyle('SUCCESS'),
                new MessageButton()
                    .setCustomId('application-cancel')
                    .setEmoji('❌')
                    .setLabel('Cancel')
                    .setStyle('DANGER'),
            ]),
        ],
    });
    if (input instanceof CommandInteraction) {
        await input.reply(
            `Your application channel has been created ${newChannel}`
        );
    }
}

export async function closeApplication(
    interaction: ButtonInteraction
): Promise<void> {
    const {
        message,
        channel,
        guild,
        client: { user: clientUser },
        user,
        customId,
    } = interaction;
    const { embeds } = channel?.messages.cache.get(message.id) ?? {};

    if (
        !guild ||
        guild.id !== process.env.COMMUNITY_SERVER_ID ||
        !clientUser ||
        !embeds ||
        !channel
    ) {
        return;
    }

    const applicationName = embeds.find(embed =>
        embed.title?.endsWith(' Application')
    )?.title;
    if (
        channel.type !== 'GUILD_TEXT' ||
        !channel.name.match(/^.{2,32}-\d{4}-.+-application$/) ||
        message.author.id !== clientUser.id ||
        !applicationName
    ) {
        return;
    }

    const memberId = channel.permissionOverwrites.cache.find(
        overwrite => overwrite.type === 'member'
    )?.id;

    if (!memberId || memberId !== user.id) {
        return;
    }

    if (customId === 'application-submit') {
        await yesNoButton(
            interaction,
            'Please confirm again that you are ready to submit.\n⚠️ Warning, once you confirm submit, the channel will be locked down and admins will be pinged to review your application, you cannot send new messages here anymore.',
            async () => {
                await channel.permissionOverwrites.edit(
                    guild.roles.everyone,
                    {
                        SEND_MESSAGES: false,
                    },
                    {
                        reason: 'Application Submit',
                    }
                );
                await channel.send(`Locked down ${channel}`);
                await channel.send(
                    `<@&804223328709115944>, ${user} has submitted the ${applicationName.toLowerCase()}.`
                );
            }
        );
    }
    if (customId === 'application-cancel') {
        await yesNoButton(
            interaction,
            'Please confirm again that you are cancelling application.\n⚠️ Warning, once you confirm cancel, the channel will be deleted, this action cannot be undone.',
            async () => channel.delete()
        );
    }
}

// TODO: check if this is still needed after changing reaction trigger to button
export async function fetchApps(client: Client): Promise<void> {
    const guild = await client.guilds.fetch(
        process.env.COMMUNITY_SERVER_ID as string
    );
    const applications = guild.channels.cache.get('807183574645735474');
    if (applications instanceof CategoryChannel) {
        applications.children.forEach(async child => {
            if (child.isText()) {
                await child.messages.fetch(
                    { limit: 100 },
                    { cache: true, force: false }
                );
            }
        });
    }
}

export async function configApps(
    input: Message | CommandInteraction
): Promise<void> {
    const { guild } = input;
    const member = guild?.members.cache.get(input.member?.user.id ?? '');

    const [, subcommand, ...args] =
        input instanceof Message
            ? input.content.split(' ')
            : [
                  null,
                  input.options.getSubcommand(true),
                  input.options.getString('position', true),
                  '|',
                  input.options.getString('questions') ?? '',
              ];
    const [position, ...questionsArgs] = args
        .join(' ')
        .split('|')
        .map(e => e.trim());

    const ref = database.ref('discord_bot/community/applications');
    const existingApplications = cache['discord_bot/community/applications'];

    if (!member || !guild) {
        return;
    }

    if (
        await cooldown(input, '!application', {
            default: 5 * 1000,
            donator: 5 * 1000,
        })
    ) {
        return;
    }

    if (!(await checkPermission(input, roleIds.Admin))) return;

    const getApplicationEmbed = (
        questions: string[],
        showPublicityInFooter?: boolean
    ) => {
        let applicationEmbed = new MessageEmbed()
            .setTitle(`${position} Application`)
            .setColor(member.displayHexColor)
            .setAuthor({
                name: member.user.tag,
                iconURL: member.displayAvatarURL({ dynamic: true }),
            })
            .setFooter({
                text:
                    typeof showPublicityInFooter === 'boolean'
                        ? `Application for ${position} is now ${
                              showPublicityInFooter ? 'opened' : 'closed'
                          }.`
                        : 'React to ✅ when finished, react to ❌ to cancel your application.',
            })
            .setTimestamp();
        questions.forEach((question, i) => {
            applicationEmbed = applicationEmbed.addField(
                `Question ${i + 1}`,
                question
            );
        });
        return applicationEmbed;
    };

    const existedApp = existingApplications.find(
        app => app.position.toLowerCase() === position.toLowerCase()
    );

    const updateCommandOptions = async () =>
        Promise.all([
            guild.commands.cache
                .find(({ name }) => name === 'apply')
                ?.edit(
                    commandData(cache['discord_bot/community/applications'])[0]
                ),
            guild.commands.cache
                .find(({ name }) => name === 'application')
                ?.edit(
                    commandData(cache['discord_bot/community/applications'])[1]
                ),
        ]);

    switch (subcommand?.toLowerCase()) {
        case 'add':
            if (existedApp) {
                await reply(
                    input,
                    `Application for ${position} already exist, use \`edit\` to edit the questions instead`
                );
                return;
            }

            await yesNoButton(
                input,
                {
                    content:
                        "Here's a preview of how the application would look like, react to ✅ in 1 minute to confirm, react to ❌ to cancel",
                    embeds: [getApplicationEmbed(questionsArgs)],
                },
                async sentMessage => {
                    await ref.set(
                        existingApplications.concat({
                            isOpen: true,
                            position,
                            questions: questionsArgs,
                        })
                    );
                    await updateCommandOptions();
                    await edit(
                        input instanceof CommandInteraction
                            ? input
                            : sentMessage,
                        {
                            content: `Added ${position} application and it's opened for application.`,
                            embeds: [],
                            components: [],
                        }
                    );
                }
            );

            break;
        case 'edit':
            if (!existedApp) {
                await reply(
                    input,
                    `Application for ${position} does not exist, use \`add\` to add a new application.`
                );
                return;
            }
            await yesNoButton(
                input,
                {
                    content:
                        "Here's a preview of how the application would look like, react to ✅ in 1 minute to confirm, react to ❌ to cancel",
                    embeds: [getApplicationEmbed(questionsArgs)],
                },
                async sentMessage => {
                    await ref.set(
                        existingApplications.map(app => {
                            if (
                                app.position.toLowerCase() ===
                                position.toLowerCase()
                            ) {
                                // eslint-disable-next-line no-param-reassign
                                app.questions = questionsArgs;
                            }
                            return app;
                        })
                    );
                    await edit(
                        input instanceof CommandInteraction
                            ? input
                            : sentMessage,
                        {
                            content: `Edited ${position} application.`,
                            embeds: [],
                            components: [],
                        }
                    );
                }
            );
            break;
        case 'delete':
            if (!existedApp) {
                await reply(
                    input,
                    `Application for ${position} does not exist.`
                );
                return;
            }

            await yesNoButton(
                input,
                {
                    content: `${member} You are about to delete this application, react to ✅ in 1 minute to confirm delete, react to ❌ to cancel`,
                    embeds: [
                        getApplicationEmbed(
                            existedApp.questions,
                            existedApp.isOpen
                        ),
                    ],
                },
                async sentMessage => {
                    await ref.set(
                        existingApplications.map(app => {
                            if (
                                app.position.toLowerCase() ===
                                position.toLowerCase()
                            ) {
                                // eslint-disable-next-line no-param-reassign
                                app.questions = questionsArgs;
                            }
                            return app;
                        })
                    );
                    await updateCommandOptions();
                    await ref.set(
                        existingApplications.filter(
                            app =>
                                app.position.toLowerCase() !==
                                position.toLowerCase()
                        )
                    );
                    await edit(
                        input instanceof CommandInteraction
                            ? input
                            : sentMessage,
                        {
                            content: `Removed ${position} application.`,
                            embeds: [],
                            components: [],
                        }
                    );
                }
            );

            break;
        case 'toggle':
            if (!existedApp) {
                await reply(
                    input,
                    `Application for ${position} does not exist.`
                );
                return;
            }
            await ref.set(
                existingApplications.map(app => {
                    if (app.position.toLowerCase() === position.toLowerCase()) {
                        // eslint-disable-next-line no-param-reassign
                        app.isOpen = !app.isOpen;
                    }
                    return app;
                })
            );
            await updateCommandOptions();
            await reply(
                input,
                `Application for ${position} is now ${
                    existedApp.isOpen ? 'opened' : 'closed'
                }.`
            );

            break;
        case 'show':
            await reply(input, {
                embeds: [
                    !existedApp
                        ? new MessageEmbed()
                              .setTitle(`All Applications`)
                              .setColor(member.displayHexColor)
                              .setAuthor({
                                  name: member.user.tag,
                                  iconURL: member.displayAvatarURL({
                                      dynamic: true,
                                  }),
                              })
                              .setDescription(
                                  existingApplications
                                      .map(
                                          app =>
                                              `${
                                                  app.isOpen
                                                      ? 'opened'
                                                      : 'closed'
                                              } \`${app.position}\``
                                      )
                                      .join('\n')
                              )
                        : getApplicationEmbed(
                              existedApp.questions,
                              existedApp.isOpen
                          ),
                ],
            });

            break;
        case 'export':
        case 'exports':
            {
                const target = existingApplications.find(
                    app => app.position.toLowerCase() === position.toLowerCase()
                );
                await reply(
                    input,
                    !target
                        ? {
                              embeds: [
                                  new MessageEmbed()
                                      .setTitle(`All Applications`)
                                      .setColor(member.displayHexColor)
                                      .setAuthor({
                                          name: member.user.tag,
                                          iconURL: member.displayAvatarURL({
                                              dynamic: true,
                                          }),
                                      })
                                      .setDescription(
                                          existingApplications
                                              .map(
                                                  app =>
                                                      `${
                                                          app.isOpen
                                                              ? 'opened'
                                                              : 'closed'
                                                      } \`${app.position}\``
                                              )
                                              .join('\n')
                                      ),
                              ],
                          }
                        : `\`\`\`${target.position} | ${target.questions.join(
                              ' | '
                          )}\`\`\``
                );
            }
            break;
        default:
            await reply(input, {
                embeds: [
                    new MessageEmbed()
                        .setTitle('Command Parse Error')
                        .setColor('#ff0000')
                        .setDescription('usage of the command')
                        .addField(
                            'Adding new application',
                            '`!application add <position> | <questions separated with linebreaks>`' +
                                '\n' +
                                'Example```!application add ADMIN | Why do you want to be admin? | How will you do your admin task? | How active are you?```'
                        )
                        .addField(
                            'Editing existing application',
                            '`!application edit <position> | <questions separated with linebreaks>`' +
                                '\n' +
                                'Example```!application edit ADMIN | Why do you want to be admin? | How will you do your admin task? | How active are you?```'
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
                        ),
                ],
            });
    }
}
