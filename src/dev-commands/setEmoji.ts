import { ApplicationCommandData, CommandInteraction } from 'discord.js';
import { database } from 'register/firebase';
import cache from 'util/cache';

export default async function setEmoji(
    interaction: CommandInteraction
): Promise<void> {
    const { dice } = cache;
    const { client, options } = interaction;

    if (options.getString('env', true) !== process.env.NODE_ENV) return;
    const emoji = options.getString('emoji', true);
    const diceName = options.getString('dice', true);
    const emojiId = emoji.match(/^<:.+:([0-9]+)>$/)?.[1];
    if (!emojiId) {
        await interaction.reply(`\`${emoji}\` is not valid emoji`);
        return;
    }
    const newEmoji = client.emojis.cache.get(emojiId);
    if (!newEmoji) {
        await interaction.reply(
            `\`${emoji}\` comes from a server that the bot do not live in, please use another emoji.`
        );
        return;
    }

    const die = dice.find(d => d.name.toLowerCase() === diceName.toLowerCase());
    if (!die && diceName !== '?') {
        await interaction.reply(`\`${diceName}\` is not valid dice`);
        return;
    }
    const dieId = die?.id || -1;
    await database.ref(`/discord_bot/emoji/${dieId}`).set(emoji);
    await database
        .ref('last_updated/discord_bot')
        .set(new Date().toISOString());
    await interaction.reply(
        `Successfully set ${emoji} as emoji for ${diceName}`
    );
}

export const commandData: ApplicationCommandData = {
    name: 'set-dice-emoji',
    description: 'Set emoji for a dice',
    options: [
        {
            name: 'env',
            description:
                'which environment of the bot should that respond from.',
            type: 'STRING',
            required: true,
            choices: [
                {
                    name: 'production',
                    value: 'production',
                },
                {
                    name: 'development',
                    value: 'development',
                },
            ],
        },
        {
            name: 'emoji',
            description: 'Emoji to set',
            type: 'STRING',
            required: true,
        },
        {
            name: 'dice',
            description: 'Dice to set emoji for',
            type: 'STRING',
            required: true,
        },
    ],
};
