import * as Discord from 'discord.js';
import logMessage from '../dev-commands/logMessage';

export default async function spy(message: Discord.Message): Promise<void> {
    try {
        const { guild, member, content, client, author, channel } = message;
        if (
            !guild ||
            !member ||
            guild.id !== '818961659086766111' ||
            !channel.isText()
        )
            return;

        const communityDiscord = await client.guilds.fetch(
            '804222694488932362'
        );
        const spyLog = communityDiscord.channels.cache.get(
            '852355980779978752'
        );
        if (!spyLog?.isText()) return;
        const sensitiveWords = /(?<hack>hack\w*)|(?<buy>buy\w*)|(?<sell>sell\w*)|(?<boost>boost\w*)|(?<account>account\w*)|(?<price>price\w*)/gi;
        const [sliced1, sliced2] = [
            content.slice(0, 1024),
            content.slice(1024),
        ];
        const embed = new Discord.MessageEmbed()
            .setAuthor(
                `${author.username}#${author.discriminator}`,
                author.displayAvatarURL({ dynamic: true })
            )
            .setTitle('Hack Discord Spied Message')
            .setColor(member.displayColor)
            .addField('User', author)
            .addField('In Channel', (channel as Discord.GuildChannel).name)
            .addField('Content', sliced1 || '*nothing*')
            .setFooter(
                guild.name,
                guild.iconURL({ dynamic: true }) ?? undefined
            )
            .setTimestamp();
        await spyLog.send(
            sensitiveWords.test(content)
                ? `<@&845586534660046868> Sensitive keyword(s) triggered: ${Array.from(
                      content.matchAll(sensitiveWords) || []
                  )
                      .map(match => `**${match[0]}**`)
                      .join(' ')}`
                : '',
            sliced2 ? embed.addField('‎', sliced2) : embed
        );
    } catch (err) {
        try {
            await logMessage(message.client, err.stack);
        } catch (e) {
            // no action
        }
    }
}
