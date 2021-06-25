import Discord from 'discord.js';

export default async function setChannel(
    message: Discord.Message
): Promise<void> {
    const { client, embeds, webhookID, channel, guild } = message;
    const { COMMUNITY_SERVER_ID } = process.env;

    if (
        !guild ||
        !webhookID ||
        channel.id !== '805059910484099112' ||
        !embeds
    ) {
        return;
    }

    const [embed] = embeds;
    if (!embed || embed.title !== 'Member joined') return;
    const id = embed.footer?.text?.match(/^ID: (\d{18})$/)?.[1];
    if (!id) return;
    const member = await guild.members.fetch(id);

    if (!COMMUNITY_SERVER_ID) {
        await channel.send(
            'Error: Missing `COMMUNITY_SERVER_ID` env in bot code, please contact an firebase.'
        );
        return;
    }

    const communityDiscord = await client.guilds.fetch(COMMUNITY_SERVER_ID);

    try {
        await communityDiscord.fetchBan(id);
    } catch (err) {
        if (err.message !== 'Unknown Ban') throw new Error(err);
        try {
            const memberOfMain = await communityDiscord.members.fetch(id);
            if (
                !memberOfMain.roles.cache.find(role =>
                    [
                        '804223328709115944',
                        '804223928427216926',
                        '807219483311603722',
                    ].includes(role.id)
                )
            ) {
                throw new Error();
            }
            return;
        } catch {
            await member.user.send(
                'You are not banned in the main discord, you are kicked from the ban appeal discord.'
            );
            await member.kick(
                'Member requested a ticket without being banned in the main discord.'
            );
            return;
        }
    }
    const appealRoomCat = guild.channels.cache.get('805035618765242369');
    const appealRoom = await guild.channels.create(
        `${member.user.username}${member.user.discriminator}`,
        {
            parent: appealRoomCat,
        }
    );
    await appealRoom.updateOverwrite(member, {
        VIEW_CHANNEL: true,
    });
    await appealRoom.send(
        member,
        new Discord.MessageEmbed()
            .setTitle('Appeal Form')
            .setDescription(
                `Welcome to the randomdice.gg unbanning server.\n` +
                    `Before we can start processing your application for a ban, we need important key information from you.\n` +
                    `It should be said that your application will be rejected with immediate effect if we expose one or more of your information as a lie.\n` +
                    `We need the following information from you: `
            )
            .setColor('#6ba4a5')
            .addField(
                'When were you banned?',
                '*Specify the date, time and your time zone to make it easier for us.*'
            )
            .addField(
                'What reason was given for your ban?',
                '*If it was not provided, say not provided*'
            )
            .addField(
                'Why should you be unbanned?',
                '*You will only be unbanned if you are not guilty*'
            )
            .addField(
                'Would you like to add further information to your application that could help with your unban? ',
                '*If so, please attach them.*'
            )
            .setTimestamp()
    );
}
