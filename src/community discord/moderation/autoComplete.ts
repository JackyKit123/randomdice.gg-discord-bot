import { AutocompleteInteraction } from 'discord.js';
import Reasons from './reasons.json';

const commonMuteReasons: (keyof typeof Reasons)[] = [
    'Spamming',
    'NSFW or Illegal Content',
    'Offensive Language',
    'Disrespecting Members',
    'Trolling',
    'Unauthorized Advertising',
    'NSFW or Offensive Profile',
];

const commonWarnReasons: (keyof typeof Reasons)[] = [
    ...commonMuteReasons,
    'Warn to Leave Hack Servers',
];

const commonBanReasons: (keyof typeof Reasons)[] = [
    ...commonMuteReasons,
    'Member in Hack Servers',
    'Hacking',
    'Underage',
    'Ban Evasion',
    'Scam Links',
];

const commonKickReasons: (keyof typeof Reasons)[] = [
    'NSFW or Offensive Profile',
];

const mapToChoices = (reasons: string[]) =>
    reasons.map(reason => ({
        name: reason,
        value: reason,
    }));

export default async function modActionReasonAutoComplete(
    interaction: AutocompleteInteraction<'cached'>
): Promise<void> {
    switch (interaction.commandName) {
        case 'ban':
            await interaction.respond(mapToChoices(commonBanReasons));
            break;
        case 'warn':
            await interaction.respond(mapToChoices(commonWarnReasons));
            break;
        case 'mute':
            await interaction.respond(mapToChoices(commonMuteReasons));
            break;
        case 'kick':
            await interaction.respond(mapToChoices(commonKickReasons));
            break;
        case 'modlog':
            if (interaction.options.getSubcommand() === 'edit-reason')
                await interaction.respond(mapToChoices(Object.keys(Reasons)));
            break;
        default:
    }
}
