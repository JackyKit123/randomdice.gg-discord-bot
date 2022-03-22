import { goldenPickaxe, pickaxe } from 'config/emojiId';
import {
    CommandInteraction,
    GuildChannel,
    GuildMember,
    GuildTextBasedChannel,
    MessageActionRow,
    MessageButton,
    MessageManager,
    User,
} from 'discord.js';
import { activeCoinbombInChannel } from '.';

export type BatchType =
    | typeof pickaxe
    | typeof goldenPickaxe
    | 'small'
    | 'medium'
    | 'large'
    | 'rick';

export type GoldenPick = 'awaiting to be picked up' | GuildMember | false;

export const getCoinbombPickaxeButtons = (
    input: GuildTextBasedChannel | BatchType
): MessageActionRow[] => {
    let type;
    let goldenPick;
    if (input instanceof GuildChannel) {
        const activeCoinbomb = activeCoinbombInChannel.get(input);
        if (!activeCoinbomb || activeCoinbomb === 'rick') return [];
        ({ goldenPick, collectionTrigger: type } = activeCoinbomb);
    } else {
        type = input;
    }
    const pickaxeButton = new MessageButton()
        .setEmoji(pickaxe)
        .setCustomId(pickaxe)
        .setStyle('PRIMARY');
    const goldenPickaxeButton = new MessageButton()
        .setEmoji(goldenPickaxe)
        .setCustomId(goldenPickaxe)
        .setStyle('PRIMARY');
    return goldenPick || type === pickaxe || type === goldenPickaxe
        ? [
              new MessageActionRow().addComponents(
                  goldenPick === 'awaiting to be picked up' ||
                      type === goldenPickaxe
                      ? [pickaxeButton, goldenPickaxeButton]
                      : [pickaxeButton]
              ),
          ]
        : [];
};

export const checkForActiveCoinbombInChannel = async (
    interaction: CommandInteraction
): Promise<boolean> => {
    if (!interaction.inCachedGuild() || !interaction.channel) return false;
    if (activeCoinbombInChannel.has(interaction.channel)) {
        await interaction.reply({
            content:
                'There is an active coinbomb in this channel, you cannot spawn a new one before the last one has ended.',
            ephemeral: true,
        });
        return true;
    }
    return false;
};

export async function getActiveChattingMemberCount(
    messages: MessageManager
): Promise<number> {
    const fetchedMessage = messages.cache.size
        ? messages.cache
        : await messages.fetch({ limit: 100 });

    const chatters = new Set<User>();

    fetchedMessage
        .filter(({ author }) => !author.bot)
        .last(10)
        .forEach(({ author }) => chatters.add(author));
    fetchedMessage.forEach(({ createdTimestamp, author }) => {
        if (Date.now() - createdTimestamp < 60 * 1000) chatters.add(author);
    });

    return chatters.size;
}

export const getRandomCollectionTrigger = (triggers: string[]): string =>
    triggers[Math.floor(Math.random() * triggers.length)];

export const nPeopleOrPerson = (n: number): string =>
    `${n === 1 ? '' : n}${n === 1 ? 'person' : ' people'}`;

export const membersHasOrHave = (
    members: GuildMember[] | Map<GuildMember, unknown>
): string => {
    const membersArray = Array.isArray(members) ? members : [...members.keys()];
    return `${membersArray.join(' ')} ${
        membersArray.length === 1 ? 'has' : 'have'
    }`;
};
