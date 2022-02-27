import Discord from 'discord.js';
import parseMsIntoReadableText from 'util/parseMS';

export default async function announceLastToLeaveVC(
    message: Discord.Message
): Promise<void> {
    const { webhookId, embeds, guild, channel } = message;
    let embed = embeds?.[0];
    if (
        channel.id !== '804243533195640852' /* #voice-log */ ||
        !webhookId ||
        !embed ||
        !guild
    ) {
        return;
    }
    const { title, description, footer, timestamp } = embed;
    const leaveVcRegex = /^\*\*.+#\d{4}\*\* left #Last to Leave VC Event$/;
    let changeVcRegex =
        /^\*\*Before:\*\* #Last to Leave VC Event\n\*\*\+After:\*\* #.+$/;
    const id = footer?.text?.match(/^ID: (\d{18})$/)?.[1];
    if (
        !(
            (title === 'Member left voice channel' &&
                description?.match(leaveVcRegex)) ||
            (title === 'Member changed voice channel' &&
                description?.match(changeVcRegex))
        ) ||
        !id
    ) {
        return;
    }
    const member = guild.members.cache.get(id);
    if (member) {
        const messages = await channel.messages.fetch({
            limit: 100,
        });
        const joinMessage = messages.find(msg => {
            [embed] = msg.embeds;
            const joinVCRegex =
                /^\*\*.+#\d{4}\*\* joined #Last to Leave VC Event$/;
            changeVcRegex =
                /^\*\*Before:\*\* #.+\n\*\*\+After:\*\* #Last to Leave VC Event$/;
            if (!msg.webhookId || !embed) {
                return false;
            }
            if (
                ((embed.title === 'Member joined voice channel' &&
                    embed.description?.match(joinVCRegex)) ||
                    (embed.title === 'Member changed voice channel' &&
                        embed.description?.match(changeVcRegex))) &&
                embed.footer?.text?.match(/^ID: (\d{18})$/)?.[1] === id
            ) {
                return true;
            }
            return false;
        });
        const timeSpan =
            (timestamp || 0) - (joinMessage?.embeds?.[0].timestamp || 0);
        const logChannel = guild.channels.cache.get('805943260987392000');
        if (logChannel?.isText())
            await logChannel.send(
                !joinMessage
                    ? `${member} has left <#810580588569296916> but I am unable to locate the join time.`
                    : `${member} has stayed in <#810580588569296916> for ${parseMsIntoReadableText(
                          timeSpan
                      )}`
            );
    }
}
