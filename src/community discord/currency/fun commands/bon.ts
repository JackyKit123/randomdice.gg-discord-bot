import channelIds from 'config/channelIds';
import {
    ApplicationCommandData,
    CommandInteraction,
    MessageEmbed,
} from 'discord.js';
import cooldown from 'util/cooldown';
import commandCost from './commandCost';

export default async function bon(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { options, user, guild, commandName } = interaction;

    if (
        await cooldown(interaction, commandName, {
            default: 60 * 1000,
            donator: 30 * 1000,
        })
    )
        return;

    const target = options.getMember('member', true);
    const reason = options.getString('reason') || 'no reason';

    if (!(await commandCost(interaction, 1000))) return;
    const general = guild.channels.cache.get(channelIds.general);
    await interaction.reply(`Goodbye ${target}, get fucking bonned!`);
    if (general?.isText())
        await general.send({
            embeds: [
                new MessageEmbed()
                    .setImage(
                        'https://media1.tenor.com/images/7a9fe7f23548941c33b2ef1609c3d31c/tenor.gif?itemid=10045949'
                    )
                    .setThumbnail(
                        target.displayAvatarURL({
                            dynamic: true,
                        })
                    )
                    .setTitle(`${target.user.tag} Got bonned`)
                    .setColor('#ff0000')
                    .setDescription(
                        `${target} got bonned by ${user} for ||${reason}||`
                    ),
            ],
        });
}

export const commandData: ApplicationCommandData = {
    name: 'bon',
    description: `Bon a member, you don't need to be a mod to use this command`,
    options: [
        {
            name: 'member',
            type: 'USER',
            description: 'The member to bon',
            required: true,
        },
        {
            name: 'reason',
            type: 'STRING',
            description: 'The reason for boning the member',
        },
    ],
};
