import { rickCoin } from 'config/emojiId';
import roleIds from 'config/roleId';
import {
    ApplicationCommandData,
    CommandInteraction,
    GuildTextBasedChannel,
    Message,
    GuildMember,
} from 'discord.js';
import cooldown from 'util/cooldown';
import { suppressUnknownMessage } from 'util/suppressErrors';
import wait from 'util/wait';
import { activeCoinbombInChannel } from '../coinbomb';
import {
    checkForActiveCoinbombInChannel,
    getActiveChattingMemberCount,
    getRandomCollectionTrigger,
    membersHasOrHave,
    nPeopleOrPerson,
} from '../coinbomb/util';
import commandCost from './commandCost';

const basicCollectionTriggers = [
    'GIMME',
    'MINE',
    'RICK',
    'COLLECT',
    'ROB',
    'GRAB',
    'YOINK',
];
const advancedCollectionTriggers = [
    'OMG Gimme all those',
    'I need all those',
    'PLZ COINS PLZ',
    'I am poor pls donate',
    'Gotta grab them this time',
    'Those are mine',
    'I am gonna yoink them all',
    'I am fan pls give',
];

const rickBombInChannels = new Map<
    GuildTextBasedChannel,
    { collectionTrigger: string; rickRolled: Set<GuildMember> }
>();

export default async function rickBomb(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { options, channel: originalChannel } = interaction;
    let channel = originalChannel;

    if (!channel) return;

    const anotherChannel = options.getChannel('channel');

    if (anotherChannel?.isText()) {
        channel = anotherChannel;
    }

    if (
        await cooldown(interaction, {
            default: 60 * 1000 * 5,
            donator: 60 * 1000 * 1,
        })
    ) {
        return;
    }
    if (await checkForActiveCoinbombInChannel(interaction)) return;

    if (!(await commandCost(interaction, 500))) return;

    await interaction.reply({
        content: `${rickCoin} is on the way!`,
        ephemeral: true,
    });

    const rand = Math.random();
    let messageToSend: string;
    let collectionTrigger: string;
    let endMessage: (members: GuildMember[]) => string = () => '';
    const activeChatters = await getActiveChattingMemberCount(channel.messages);

    if (rand > 0.5) {
        collectionTrigger = getRandomCollectionTrigger(basicCollectionTriggers);
        messageToSend = `💵💵 A batch of ${rickCoin} rick has shown up, the first ${nPeopleOrPerson(
            Math.ceil(activeChatters / 2)
        )} to type \`${collectionTrigger}\` can watch rick roll. 💵💵`;
        endMessage = (members): string =>
            `${rickCoin} ${membersHasOrHave(
                members
            )} gone to watch rick roll videos ${rickCoin}`;
    } else if (rand > 0.1) {
        collectionTrigger = getRandomCollectionTrigger(basicCollectionTriggers);
        messageToSend = `💰💰💰💰 A huge batch of ${rickCoin} rick has shown up. The first ${nPeopleOrPerson(
            Math.ceil(activeChatters / 10)
        )} to type \`${collectionTrigger}\` can selfie with rick. 💰💰💰💰`;

        endMessage = (members): string =>
            `${rickCoin} ${membersHasOrHave(
                members
            )} ⛏️ up the huge batch of Rick Astley selfies ${rickCoin}`;
    } else {
        collectionTrigger = getRandomCollectionTrigger(
            advancedCollectionTriggers
        );
        messageToSend = `💎💎💎💎💎💎**BIG MONEY TIME**💎💎💎💎💎💎\n${rickCoin} Rick has shown up. The first ${nPeopleOrPerson(
            1
        )} to type \`${collectionTrigger}\` can get rick rolled.`;
        endMessage = (members): string =>
            `${rickCoin}\n ${membersHasOrHave(members)} got rick roll`;
    }

    const coinbombMessage = await channel.send(messageToSend);
    activeCoinbombInChannel.set(channel, 'rick');
    rickBombInChannels.set(channel, {
        collectionTrigger,
        rickRolled: new Set(),
    });
    await wait(20 * 1000);

    const result = rickBombInChannels.get(channel);
    if (result?.rickRolled.size) {
        await coinbombMessage
            .edit(endMessage([...result.rickRolled]))
            .catch(suppressUnknownMessage);
    } else {
        await coinbombMessage.delete();
    }
    activeCoinbombInChannel.delete(channel);
    rickBombInChannels.delete(channel);
}

export async function rickBombOnCollect(message: Message<true>): Promise<void> {
    const { channel, member, content } = message;
    if (!member) return;
    const activeCoinbomb = activeCoinbombInChannel.get(channel);
    const activeRickBomb = rickBombInChannels.get(channel);
    if (
        !activeCoinbomb ||
        content.toLowerCase() !==
            activeRickBomb?.collectionTrigger.toLowerCase() ||
        activeRickBomb.rickRolled.has(member)
    )
        return;
    await Promise.all([
        message.react(rickCoin),
        member.roles.add(roleIds.rick),
    ]);
    activeRickBomb.rickRolled.add(member);
    await wait(1000 * 60 * 5);
    await member.roles.remove(roleIds.rick);
}

export const commandData: ApplicationCommandData = {
    name: 'rickbomb',
    description: 'Spawns a rickbomb',
    options: [
        {
            name: 'channel',
            description: 'The channel to spawn the rickbomb in',
            type: 'CHANNEL',
        },
    ],
};
