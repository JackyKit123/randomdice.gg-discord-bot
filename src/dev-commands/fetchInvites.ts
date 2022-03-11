import {
    ApplicationCommandData,
    CategoryChannel,
    CommandInteraction,
    Guild,
} from 'discord.js';

export async function createInvite(guild: Guild): Promise<string> {
    const {
        channels,
        client: { user },
    } = guild;

    if (!user) throw new Error('Client user is not initiated.');

    const filteredChannels = channels.cache.filter(
        channel =>
            !channel.isThread() &&
            !(channel instanceof CategoryChannel) &&
            !!channel.permissionsFor(user)?.has('CREATE_INSTANT_INVITE')
    );
    const channel =
        filteredChannels.find(
            ch => ch.name === 'general' || ch.name === 'welcome'
        ) ?? filteredChannels.first();

    if (
        channel &&
        !(channel instanceof CategoryChannel || channel.isThread())
    ) {
        const invite = await channel.createInvite();
        return `Invite for server \`${guild.name} \`: ${invite.url}`;
    }
    return `Unable to create invite for ${guild.name}`;
}

export default async function createInvites(
    interaction: CommandInteraction
): Promise<void> {
    const { client, options } = interaction;

    if (options.getString('env', true) !== process.env.NODE_ENV) return;
    const guildId = options.getString('guild-id');

    if (guildId) {
        const guild = client.guilds.cache.get(guildId);

        if (!guild) {
            await interaction.reply(
                `Guild id: \`${guildId}\` is not a server I am in.`
            );
            return;
        }

        await interaction.reply(await createInvite(guild));
        return;
    }

    await interaction.reply('Creating Invites... Please allow sometime.');
    await interaction.editReply(
        `Here is a list of guilds that the bot is in as of ${new Date().toISOString()}:\n${(
            await Promise.all(client.guilds.cache.map(createInvite))
        ).join('\n')}`
    );
}

export const commandData: ApplicationCommandData = {
    name: 'create-invites',
    description: 'Creates an invite for the server.',
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
            name: 'guild-id',
            description: 'The id of the guild to create an invite for.',
            type: 'STRING',
            required: false,
        },
    ],
};
