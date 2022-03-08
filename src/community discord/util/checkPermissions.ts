import {
    ButtonInteraction,
    CacheType,
    CommandInteraction,
    ContextMenuInteraction,
    MessageEmbed,
} from 'discord.js';
import { reply } from 'util/typesafeReply';

export default async function checkPermission(
    input:
        | ButtonInteraction<CacheType>
        | CommandInteraction<CacheType>
        | ContextMenuInteraction<CacheType>,
    ...roleIds: string[]
): Promise<boolean> {
    const member = input.guild?.members.cache.get(input.member?.user.id ?? '');

    if (!member) return false;

    if (!roleIds.some(id => member.roles.cache.has(id))) {
        await reply(input, {
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
