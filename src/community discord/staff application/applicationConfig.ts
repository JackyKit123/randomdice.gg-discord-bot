import checkPermission from 'community discord/util/checkPermissions';
import roleIds from 'config/roleId';
import {
    ButtonInteraction,
    CommandInteraction,
    MessageEmbed,
} from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';
import cooldown from 'util/cooldown';
import yesNoButton from 'util/yesNoButton';
import { updateCommandOptions } from '.';

export default async function adminConfig(
    interaction: CommandInteraction<'cached'>
): Promise<void> {
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

export async function configApplicationConfirmButtons(
    interaction: ButtonInteraction<'cached'>
): Promise<void> {
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
