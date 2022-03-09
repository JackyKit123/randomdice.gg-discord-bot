import { coinDice } from 'config/emojiId';
import roleIds from 'config/roleId';
import Discord from 'discord.js';

const isInCooldown = new Map<string, boolean>();
export default async function voteAutoResponder(
    message: Discord.Message
): Promise<void> {
    const { channel, content } = message;

    if (/\bvote\b/i.test(content) && !isInCooldown.get(channel.id)) {
        await channel.send({
            embeds: [
                new Discord.MessageEmbed()
                    .setTitle('VOTE VOTE VOTE!!!')
                    .setDescription(
                        `I heard someone said \`vote\`. Do you know you can vote for the server on [discord server list](https://top.gg/servers/${process.env.COMMUNITY_SERVER_ID}/vote) and get you ${roleIds.Voted} role.`
                    )
                    .addField(
                        'Special Perks for @Voted Role',
                        `+ ${coinDice} 1000 everytime you vote!\n+ \`x5\` chat coins multi guild-wise\n+ access to premium bot channels with have \`x2\` chat coins multi`
                    ),
            ],
        });
        isInCooldown.set(channel.id, true);
        setTimeout(() => isInCooldown.set(channel.id, false), 5 * 60 * 1000);
    }
}
