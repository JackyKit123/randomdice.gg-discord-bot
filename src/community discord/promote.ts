import channelIds from 'config/channelIds';
import { tier5RoleIds } from 'config/roleId';
import {
    ApplicationCommandData,
    CommandInteraction,
    GuildMember,
    MessageAttachment,
    MessageEmbed,
} from 'discord.js';
import { suppressCannotDmUser } from 'util/suppressErrors';
import checkPermission from './util/checkPermissions';

const activePromotionCreation = new Map<string, boolean>();

async function createPromotion(
    member: GuildMember
): Promise<MessageEmbed | false> {
    const { user } = member;
    const { channel } = await user.send(
        'What type of content do you wish to promote? (e.g. YouTube, Discord Server, Random Dice Crew)'
    );
    let awaitedMessage = await channel.awaitMessages({
        filter: m => !!m.content,
        time: 1000 * 60,
        max: 1,
    });
    const promotionType = awaitedMessage.first();
    if (!promotionType) {
        await user.send('You did not answer the question in time');
        return false;
    }
    await user.send('Please provide a description of your promotion');
    awaitedMessage = await channel.awaitMessages({
        filter: m => !!m.content,
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
    awaitedMessage = await channel.awaitMessages({
        filter: m =>
            /^https?:\/\//i.test(m.content) ||
            m.content.toLowerCase() === 'skip',
        time: 1000 * 60,
        max: 1,
    });
    const url = awaitedMessage.first();
    if (!url) {
        await user.send('You did not answer the question in time');
        return false;
    }
    await user.send('You can provide an image, or say **skip**');
    awaitedMessage = await channel.awaitMessages({
        filter: m => !!m.attachments.size || m.content === 'skip',
        time: 1000 * 60 * 5,
        max: 1,
    });
    const image = awaitedMessage.first();
    if (!image) {
        await user.send('You did not answer the question in time');
        return false;
    }

    let embed = new MessageEmbed()
        .setAuthor({
            name: user.tag,
            iconURL: user.displayAvatarURL({ format: 'png' }),
        })
        .setTitle(`Promotion of ${promotionType}`)
        .setFooter({ text: user.id })
        .setTimestamp();

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
            (image.attachments.first() as MessageAttachment).url
        );
    }
    await user.send({
        content:
            'This is how the embed will look, reply `yes` if you confirm to post it, or `no` to redo making the embed.',
        embeds: [embed],
    });
    awaitedMessage = await channel.awaitMessages({
        filter: m => /^(y(:es)?|(no?)$)/i.test(m.content),
        time: 1000 * 60,
        max: 1,
    });
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

export default async function advertise(
    interaction: CommandInteraction
): Promise<void> {
    if (!interaction.inCachedGuild()) return;
    const { guild, member, user } = interaction;

    if (!(await checkPermission(interaction, ...tier5RoleIds))) return;

    const promotionChannel = guild.channels.cache.get(
        channelIds['promotion-and-ads']
    );
    if (!promotionChannel?.isText()) {
        await interaction.reply(
            'The promotion channel is not found, please contact an admin.'
        );
        return;
    }
    const promotions = await promotionChannel.messages.fetch();
    const existingUserPromotion = promotions.find(
        promotion =>
            promotion.embeds?.[0]?.footer?.text === user.id &&
            promotion.createdTimestamp + 1000 * 60 * 60 * 24 > Date.now()
    );
    if (activePromotionCreation.get(user.id)) {
        await interaction.reply(
            'Please first finish previous the promotion creation or exit it.'
        );
        return;
    }

    try {
        activePromotionCreation.set(user.id, true);
        const dmMessage = await user
            .send(
                `Hi, please answer a few questions for me to post a promotion advertisement. You can type \`exit\` at anytime to quit this campaign maker.\n${
                    existingUserPromotion
                        ? 'I found a promotion in the last 24 hours from you, your last promotion will be edited instead of sending a new one.'
                        : ''
                }`
            )
            .catch(suppressCannotDmUser);
        if (!dmMessage) {
            await interaction.reply(
                'I cannot send DM to you. In order to create your advertisement, please make sure you have DM enabled.'
            );
            return;
        }
        await interaction.reply('Please proceed in DM channel.');

        const item = await Promise.race([
            createPromotion(member),
            user.dmChannel?.awaitMessages({
                filter: m => m.content.toLowerCase() === 'exit',
                max: 1,
            }),
        ]);
        const isEmbed = (arg: typeof item): arg is MessageEmbed =>
            arg instanceof MessageEmbed;
        if (!isEmbed(item)) {
            activePromotionCreation.set(user.id, false);
            return;
        }
        if (existingUserPromotion) {
            await existingUserPromotion.edit({ embeds: [item] });
            await user.send(
                `Your promotion has been edited\n${existingUserPromotion.url}`
            );
        } else {
            const sent = await promotionChannel.send({ embeds: [item] });
            await user.send(`Your promotion has been sent\n${sent.url}`);
        }
        activePromotionCreation.set(user.id, false);
    } catch (err) {
        activePromotionCreation.set(user.id, false);
        throw err;
    }
}

export const commandData: ApplicationCommandData = {
    name: 'advertise',
    description: 'Create a promotion advertisement',
};
