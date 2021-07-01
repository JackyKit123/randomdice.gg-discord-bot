import Discord from 'discord.js';

const activePromotionCreation = new Map<string, boolean>();

async function createPromotion(
    member: Discord.GuildMember
): Promise<Discord.MessageEmbed | false> {
    const { user } = member;
    const { channel } = await user.send(
        'What type of content do you wish to promote? (e.g. YouTube, Discord Server, Random Dice Crew)'
    );
    let awaitedMessage = await channel.awaitMessages(m => !!m.content, {
        time: 1000 * 60,
        max: 1,
    });
    const promotionType = awaitedMessage.first();
    if (!promotionType) {
        await user.send('You did not answer the question in time');
        return false;
    }
    await user.send('Please provide a description of your promotion');
    awaitedMessage = await channel.awaitMessages(m => !!m.content, {
        time: 1000 * 60 * 5,
        max: 1,
    });
    const description = awaitedMessage.first();
    if (!description) {
        await user.send('You did not answer the question in time');
        return false;
    }
    await user.send(
        'Please provide the url for your promotion, or you can say **skip**, make sure the url starts with https:// or http:// or I will ignore it'
    );
    awaitedMessage = await channel.awaitMessages(
        m =>
            /^https?:\/\//i.test(m.content) ||
            m.content.toLowerCase() === 'skip',
        {
            time: 1000 * 60,
            max: 1,
        }
    );
    const url = awaitedMessage.first();
    if (!url) {
        await user.send('You did not answer the question in time');
        return false;
    }
    await user.send('You can provide an image, or say **skip**');
    awaitedMessage = await channel.awaitMessages(
        m => m.attachments.size || m.content === 'skip',
        {
            time: 1000 * 60 * 5,
            max: 1,
        }
    );
    const image = awaitedMessage.first();
    if (!image) {
        await user.send('You did not answer the question in time');
        return false;
    }

    let embed = new Discord.MessageEmbed()
        .setAuthor(
            `${user.username}#${user.discriminator}`,
            user.displayAvatarURL()
        )
        .setTitle(`Promotion of ${promotionType}`);

    if (member.displayColor) {
        embed = embed.setColor(member.displayColor);
    }
    if (url.content && /^https?:\/\//i.test(url.content)) {
        embed = embed.setURL(url.content).addField('Link', url.content);
    }
    if (description.content.toLowerCase() !== 'skip') {
        embed = embed.setDescription(description.content);
    }
    if (image.attachments.first()) {
        embed = embed.setImage(
            (image.attachments.first() as Discord.MessageAttachment).url
        );
    }
    await user.send(
        'This is how the embed will look, reply `yes` if you confirm to post it, or `no` to redo making the embed.',
        embed
    );
    awaitedMessage = await channel.awaitMessages(
        m => /^(y(:es)?|(no?)$)/i.test(m.content),
        {
            time: 1000 * 60,
            max: 1,
        }
    );
    const confirmation = awaitedMessage.first();
    if (confirmation?.content.match(/^y(es)?$/i)) {
        return embed;
    }
    if (confirmation?.content.match(/^no?$/i)) {
        await user.send("Okay let's try again.");
        return createPromotion(member);
    }
    await user.send('You did not answer the question in time');
    return false;
}

export default async function promote(message: Discord.Message): Promise<void> {
    const { author, member, channel, guild } = message;

    if (!member || !guild) return;
    if (
        !member.roles.cache.has('804513117228367882') &&
        !member.roles.cache.has('809143588105486346')
    ) {
        await channel.send(
            new Discord.MessageEmbed()
                .setTitle('Unable to cast command')
                .setColor('#ff0000')
                .setDescription(
                    'You need one of the following roles to use this command.\n' +
                        '<@&805388604791586826> <@&804496339794264085> <@&806896328255733780> <@&805388604791586826>'
                )
        );
        return;
    }

    if (activePromotionCreation.get(author.id)) {
        await channel.send(
            'Please first finish previous the promotion creation or exit it.'
        );
        return;
    }

    try {
        try {
            activePromotionCreation.set(author.id, true);
            await author.send(
                'Hi, please answer a few questions for me to post a promotion advertisement. You can type `exit` at anytime to quit this campaign maker.'
            );
            await channel.send('Please proceed in DM channel.');
        } catch (err) {
            if (err.message === 'Cannot send messages to this user') {
                await message.reply(
                    'I cannot send a message in your DM, please make sure you have DM enabled from member in this server. If you make sure so, this is probably my fault, please type the command again.'
                );
                return;
            }
            throw err;
        }

        const item = await Promise.race([
            createPromotion(member),
            author.dmChannel?.awaitMessages(
                m => m.content.toLowerCase() === 'exit',
                { max: 1 }
            ),
        ]);
        if (
            !item ||
            (item as Discord.Collection<
                string,
                Discord.Message
            >).first() instanceof Discord.Message
        ) {
            activePromotionCreation.set(author.id, false);
            return;
        }
        const promotionChannel = guild.channels.cache.get('860114325007237120');
        if (!promotionChannel?.isText()) {
            throw new Error('Promotion Channel not found');
        }
        await promotionChannel.send(item as Discord.MessageEmbed);
        await author.send(
            'Your promotion has been sent to <#860114325007237120>'
        );
    } catch (err) {
        activePromotionCreation.set(author.id, false);
        throw new Error(err);
    }
}
