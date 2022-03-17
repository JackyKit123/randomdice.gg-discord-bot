import {
    communityDiscordInvitePermaLink,
    randomDiceWebsiteUrl,
} from 'config/url';
import { devUsersId, devUsersMentions } from 'config/users';
import { ApplicationCommandData, CommandInteraction } from 'discord.js';
import cooldown from 'util/cooldown';

export default async function contact(
    interaction: CommandInteraction
): Promise<void> {
    if (
        await cooldown(interaction, {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    await interaction.reply(
        `${`The developer${
            devUsersId.length > 1 ? 's' : ''
        } of this bot and ${randomDiceWebsiteUrl()} ${
            devUsersId.length > 1 ? 'are' : 'is'
        } ${devUsersMentions}. You can reach the developers via admin@randomdice.gg or by joining the randomdice discord.`}\nThe randomdice discord is ${communityDiscordInvitePermaLink}`
    );
}

export const commandData: ApplicationCommandData = {
    name: 'contact',
    description: 'Get contact information for the bot developers',
};
