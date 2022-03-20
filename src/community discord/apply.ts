import channelIds from 'config/channelIds';
import { isCommunityDiscord } from 'config/guild';
import roleIds from 'config/roleId';
import {
    ApplicationCommandData,
    ButtonInteraction,
    CategoryChannel,
    CommandInteraction,
    Guild,
    MessageActionRow,
    MessageButton,
    MessageEmbed,
} from 'discord.js';
import { argDependencies } from 'mathjs';
import { database } from 'register/firebase';
import cache, { CommunityDiscordApplication } from 'util/cache';
import cooldown from 'util/cooldown';
import notYourButtonResponse, {
    checkIfUserIsInteractionInitiator,
    getMessageFromReference,
} from 'util/notYourButtonResponse';
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

const updateCommandOptions = async (guild: Guild) =>
    Promise.all([
        guild.commands.cache
            .find(({ name }) => name === 'apply')
            ?.edit(commandData(cache['discord_bot/community/applications'])[0]),
        guild.commands.cache
            .find(({ name }) => name === 'application')
            ?.edit(commandData(cache['discord_bot/community/applications'])[1]),
    ]);

export default async function Apply(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const position = interaction.options.getString('position', true);

    const { guild, member } = interaction;

    if (
        await cooldown(interaction, {
            default: 1000 * 60 * 10,
            donator: 1000 * 60 * 10,
        })
    ) {
        return;
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

    const application = applications.find(
        app =>
            position.toLowerCase() === app.position.toLowerCase() && app.isOpen
    );

    if (!application) {
        await interaction.reply({
            embeds: [
                openedApplicationsEmbed.setDescription(
                    `\`${argDependencies}\` is not a currently opened application.`
                ),
            ],
        });
        return;
    }

    const applicationCategory = guild.channels.cache.get(
        channelIds['💼 | Applications']
    );
    const newChannel = await guild.channels.create(
        `${member.user.username}-${member.user.discriminator}-${application.position}-application`,
        {
            type: 'GUILD_TEXT',
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
    );

    await newChannel.send({
        content: member.toString(),
        embeds: [
            new MessageEmbed()
                .setTitle(`${application.position} Application`)
                .setColor(member.displayHexColor)
                .setAuthor({
                    name: member.user.tag,
                    iconURL: member.displayAvatarURL({ dynamic: true }),
                })
                .setFooter({
                    text: 'Click ✅ when finished, and ❌ to cancel your application.',
                })
                .setTimestamp()
                .addFields(
                    application.questions.map((question, i) => ({
                        name: `Question ${i + 1}`,
                        value: question,
                    }))
                ),
        ],
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

    await interaction.reply(
        `Your application channel has been created ${newChannel}`
    );
}

export async function closeApplication(
    interaction: ButtonInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;

    const {
        message: { author, embeds },
        channel,
        guild,
        client: { user: clientUser },
        user,
        customId,
    } = interaction;

    const applicationName = embeds.find(embed =>
        embed.title?.endsWith(' Application')
    )?.title;

    if (
        !isCommunityDiscord(guild) ||
        !(clientUser?.id === author.id) ||
        !applicationName ||
        !channel?.isText() ||
        channel.isThread() ||
        !channel.name.match(/^.{2,32}-\d{4}-.+-application$/)
    ) {
        await interaction.reply(
            'Invalid application channel. Please contact an admin if you believe this is an error.'
        );
        return;
    }

    const memberId = channel.permissionOverwrites.cache.find(
        overwrite => overwrite.type === 'member'
    )?.id;

    if (!memberId || memberId !== user.id) {
        await notYourButtonResponse(interaction);
        return;
    }

    switch (customId) {
        case 'application-submit':
            await yesNoButton(
                interaction,
                `${user}, Please confirm again that you are ready to submit.\n⚠️ Warning, once you confirm submit, the channel will be locked down and admins will be pinged to review your application, you cannot send new messages here anymore.`
            );
            break;
        case 'application-cancel':
            await yesNoButton(
                interaction,
                `${user}, Please confirm again that you are cancelling application.\n⚠️ Warning, once you confirm cancel, the channel will be deleted, this action cannot be undone.`
            );
            break;
        default:
    }
}

export async function configApps(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { member, guild } = interaction;

    const subcommand = interaction.options.getSubcommand(true);
    const position = interaction.options.getString('position', true);
    const questionsArgs =
        interaction.options
            .getString('questions')
            ?.split('|')
            .map(question => question.trim()) ?? [];

    const ref = database.ref('discord_bot/community/applications');
    const existingApplications = cache['discord_bot/community/applications'];

    if (
        (await cooldown(interaction, {
            default: 5 * 1000,
            donator: 5 * 1000,
        })) ||
        !(await checkPermission(interaction, roleIds.Admin))
    )
        return;

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
                        : 'press ✅ when finished, press ❌ to cancel your application.',
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

    switch (subcommand) {
        case 'add':
            if (existedApp) {
                await interaction.reply(
                    `Application for ${position} already exist, use \`edit\` to edit the questions instead`
                );
                return;
            }

            await yesNoButton(interaction, {
                content:
                    "Here's a preview of how the application would look like, press ✅ in 1 minute to confirm, press ❌ to cancel",
                embeds: [getApplicationEmbed(questionsArgs)],
            });

            break;
        case 'edit':
            if (!existedApp) {
                await interaction.reply(
                    `Application for ${position} does not exist, use \`add\` to add a new application.`
                );
                return;
            }
            await yesNoButton(interaction, {
                content:
                    "Here's a preview of how the application would look like, press ✅ in 1 minute to confirm, press ❌ to cancel",
                embeds: [getApplicationEmbed(questionsArgs)],
            });
            break;
        case 'delete':
            if (!existedApp) {
                await interaction.reply(
                    `Application for ${position} does not exist.`
                );
                return;
            }

            await yesNoButton(interaction, {
                content: `${member} You are about to delete this application, press ✅ in 1 minute to confirm delete, press ❌ to cancel`,
                embeds: [
                    getApplicationEmbed(
                        existedApp.questions,
                        existedApp.isOpen
                    ),
                ],
            });
            break;
        case 'toggle':
            if (!existedApp) {
                await interaction.reply(
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
            await updateCommandOptions(guild);
            await interaction.reply(
                `Application for ${position} is now ${
                    existedApp.isOpen ? 'opened' : 'closed'
                }.`
            );
            break;
        case 'show':
            await interaction.reply({
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
        default:
    }
}

async function applicationConfirmationButtons(
    interaction: ButtonInteraction<'cached'>
) {
    if (!interaction.inCachedGuild()) return;
    const { customId, channel, guild, user } = interaction;

    const message = await getMessageFromReference(interaction.message);

    const applicationName = message?.embeds.find(embed =>
        embed.title?.endsWith(' Application')
    )?.title;

    if (!applicationName || !channel || channel.isThread()) {
        await interaction.reply({
            content: 'Invalid Application Channel',
            ephemeral: true,
        });
        return;
    }

    if (customId === 'yes-no-button-✅-application-submit') {
        await channel.permissionOverwrites.edit(
            guild.roles.everyone,
            {
                SEND_MESSAGES: false,
            },
            {
                reason: 'Application Submit',
            }
        );
        await interaction.reply('Application submitted!');
        await interaction.followUp(`Locked down ${channel}`);
        await channel.send(
            `<@&${
                roleIds.Admin
            }>, ${user} has submitted the ${applicationName.toLowerCase()}.`
        );
    }

    if (customId === 'yes-no-button-✅-application-cancel')
        await channel.delete();
}

async function configApplicationConfirmButtons(
    interaction: ButtonInteraction<'cached'>
) {
    const {
        customId,
        guild,
        message: { embeds },
    } = interaction;

    const ref = database.ref('discord_bot/community/applications');
    const existingApplications = cache['discord_bot/community/applications'];

    const applicationConfigEmbed = embeds.find(embed =>
        /.+ Application/.test(embed.title ?? '')
    );
    const position = applicationConfigEmbed?.title?.replace(/ Application/, '');
    const questions = applicationConfigEmbed?.fields.map(field => field.value);

    if (!position || !questions) {
        await interaction.reply('Invalid Message Origin.');
        return;
    }

    await updateCommandOptions(guild);

    switch (customId) {
        case 'yes-no-button-✅-application-add':
            await ref.set(
                existingApplications.concat({
                    isOpen: true,
                    position,
                    questions,
                })
            );
            await interaction.reply(
                `Added ${position} application and it's opened for application.`
            );
            break;
        case 'yes-no-button-✅-application-edit':
            await ref.set(
                existingApplications.map(app => {
                    if (app.position.toLowerCase() === position.toLowerCase()) {
                        // eslint-disable-next-line no-param-reassign
                        app.questions = questions;
                    }
                    return app;
                })
            );
            await interaction.reply(`Edited ${position} application.`);
            break;
        case 'yes-no-button-✅-application-delete':
            await ref.set(
                existingApplications.filter(
                    app => app.position.toLowerCase() !== position.toLowerCase()
                )
            );
            await interaction.reply(`Removed ${position} application.`);
            break;
        default:
    }
}

export async function applicationButtons(
    interaction: ButtonInteraction<'cached'>
): Promise<void> {
    if (!(await checkIfUserIsInteractionInitiator(interaction))) return;

    switch (interaction.customId) {
        case 'yes-no-button-✅-application-submit':
        case 'yes-no-button-✅-application-cancel':
            await applicationConfirmationButtons(interaction);
            break;
        case 'yes-no-button-✅-application-add':
        case 'yes-no-button-✅-application-edit':
        case 'yes-no-button-✅-application-delete':
            await configApplicationConfirmButtons(interaction);
            break;
        default:
    }
}
