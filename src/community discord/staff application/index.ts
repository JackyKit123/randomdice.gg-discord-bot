import {
    ApplicationCommand,
    ApplicationCommandData,
    ButtonInteraction,
    Guild,
} from 'discord.js';
import cache, { CommunityDiscordApplication } from 'util/cache';
import { checkIfUserIsInteractionInitiator } from 'util/notYourButtonResponse';
import { configApplicationConfirmButtons } from './applicationConfig';
import { applicationConfirmationButtons } from './closeApplication';

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

export const updateCommandOptions = async (
    guild: Guild
): Promise<(ApplicationCommand | undefined)[]> =>
    Promise.all([
        guild.commands.cache
            .find(({ name }) => name === 'apply')
            ?.edit(commandData(cache['discord_bot/community/applications'])[0]),
        guild.commands.cache
            .find(({ name }) => name === 'application')
            ?.edit(commandData(cache['discord_bot/community/applications'])[1]),
    ]);

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

export { default as application } from './applicationConfig';
export { default as apply } from './apply';
export { default as closeApplication } from './closeApplication';
