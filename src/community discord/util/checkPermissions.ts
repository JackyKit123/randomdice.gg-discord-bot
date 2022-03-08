import {
    ButtonInteraction,
    CacheType,
    CommandInteraction,
    ContextMenuInteraction,
    MessageEmbed,
} from 'discord.js';

export default async function checkPermission(
    interaction:
        | ButtonInteraction<CacheType>
        | CommandInteraction<CacheType>
        | ContextMenuInteraction<CacheType>,
    ...roleIds: string[]
): Promise<boolean> {
    if (!interaction.inCachedGuild()) {
        await interaction.reply('This command can only be used in a guild.');
        return false;
    }

    if (!interaction.member.roles.cache.hasAny(...roleIds)) {
        await interaction.reply({
            embeds: [
                new MessageEmbed()
                    .setTitle('Unable to cast command')
                    .setColor('#ff0000')
                    .setDescription(
                        `You need one of the following roles to use this command.\n${roleIds
                            .map(id => `<@&${id}>`)
                            .join(' ')}`
                    ),
            ],
        });
        return false;
    }
    return true;
}
