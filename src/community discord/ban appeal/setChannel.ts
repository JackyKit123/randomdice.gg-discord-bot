import * as Discord from 'discord.js';

export default async function setChannel(
    client: Discord.Client,
    message: Discord.Message
): Promise<void> {
    const { content, author, channel, guild, member, deletable } = message;
    const {
        COMMUNITY_SERVER_ID,
        COMMUNITY_APPEAL_SERVER_WELCOME_CHANNEL_ID,
    } = process.env;

    if (!guild || !member) {
        return;
    }

    if (!COMMUNITY_SERVER_ID) {
        await channel.send(
            'Error: Missing `COMMUNITY_SERVER_ID` env in bot code, please contact an admin.'
        );
        return;
    }

    const kick = async (reason: number): Promise<void> => {
        const memberRole = member.roles.highest;
        const clientRole = (guild.member(
            (client.user as Discord.ClientUser).id
        ) as Discord.GuildMember).roles.highest;
        if (memberRole.comparePositionTo(clientRole) < 0) {
            if (reason === 1) {
                await author.send(
                    'You requested a ticket without being banned in the main discord, you are kicked from the ban appeal discord.'
                );
                await member.kick(
                    'Member requested a ticket without being banned in the main discord.'
                );
                return;
            }

            if (reason === 2) {
                await author.send(
                    `You typed something else other than \`!request\` in <#${COMMUNITY_APPEAL_SERVER_WELCOME_CHANNEL_ID}>, you are kicked from the ban appeal discord.`
                );
                await member.kick(
                    `Member typed something else other than \`!request\` in <#${COMMUNITY_APPEAL_SERVER_WELCOME_CHANNEL_ID}>`
                );
            }
        }
    };

    const fetchBan = async (): Promise<
        | {
              user: Discord.User;
              reason: string;
          }
        | void
        | string
    > => {
        try {
            const communityDiscord =
                client.guilds.cache.get(COMMUNITY_SERVER_ID) ||
                (await client.guilds.fetch(COMMUNITY_SERVER_ID));
            const banObject = await communityDiscord.fetchBan(author.id);
            return banObject;
        } catch (err) {
            if (err.message === 'Unknown Ban') {
                return 'Unknown Ban';
            }
            throw err;
        }
    };
    if (deletable) {
        try {
            await message.delete();
        } finally {
            //
        }
    }
    if (content === '!request') {
        const banObject = await fetchBan();
        if (banObject === 'Unknown Ban') {
            await kick(1);
            return;
        }
        const appealRoomCat = guild.channels.cache.get('805035618765242369');
        const appealRoom = await guild.channels.create(
            `${author.username}${author.discriminator}`,
            {
                parent: appealRoomCat,
            }
        );
        await appealRoom.updateOverwrite(author, {
            VIEW_CHANNEL: true,
        });
        await appealRoom.send(
            author.toString(),
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
        return;
    }
    await kick(2);
}
