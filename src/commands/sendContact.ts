import {
    communityDiscordInvitePermaLink,
    randomDiceWebsiteUrl,
} from 'config/url';
import { devUsersId, devUsersMentions } from 'config/users';
import {
    ApplicationCommandData,
    CommandInteraction,
    Message,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { reply } from 'util/typesafeReply';

export default async function contact(
    input: Message | CommandInteraction
): Promise<void> {
    if (
        await cooldown(input, '.gg contact', {
            default: 10 * 1000,
            donator: 2 * 1000,
        })
    ) {
        return;
    }

    const contactMessage = `${`The developer${
        devUsersId.length > 1 ? 's' : ''
    } of this bot and ${randomDiceWebsiteUrl()} ${
        devUsersId.length > 1 ? 'are' : 'is'
    } ${devUsersMentions}. You can reach the developers via admin@randomdice.gg or by joining the randomdice discord.`}\nThe randomdice discord is ${communityDiscordInvitePermaLink}`;

    await reply(input, contactMessage);
}

export const commandData: ApplicationCommandData = {
    name: 'contact',
    description: 'Get contact information for the bot developers',
};
