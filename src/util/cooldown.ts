import { patreonRolesIds } from 'config/roleId';
import { randomDiceWebsiteUrl } from 'config/url';
import { isJackykit } from 'config/users';
import {
    ButtonInteraction,
    CommandInteraction,
    ContextMenuInteraction,
    GuildMemberRoleManager,
    MessageEmbed,
} from 'discord.js';
import cache from './cache';
import parseMsIntoReadableText from './parseMS';

const commandCooldown = new Map<string, Map<string, number>>();
async function Cooldown(
    interaction: CommandInteraction,
    cooldown: {
        default: number;
        donator: number;
    }
): Promise<boolean>;
async function Cooldown(
    interaction:
        | ButtonInteraction
        | CommandInteraction
        | ContextMenuInteraction,
    cooldown: {
        default: number;
        donator: number;
    },
    command: string
): Promise<boolean>;
async function Cooldown<
    TInteraction extends
        | ButtonInteraction
        | CommandInteraction
        | ContextMenuInteraction
>(
    interaction: TInteraction,
    cooldown: {
        default: number;
        donator: number;
    },
    command: TInteraction extends ButtonInteraction ? string : void
): Promise<boolean> {
    const { user, member } = interaction;
    const roles = member?.roles ?? [];

    if (isJackykit(user)) return false;

    const now = Date.now().valueOf();
    const commandName = interaction.isButton()
        ? (command as string)
        : interaction.commandName;
    const commandCooldownList = commandCooldown.get(commandName) || new Map();
    const userCooldown = commandCooldownList.get(user.id) || 0;

    const { users } = cache;
    const userIsDonator = Object.values(users).some(
        ({ 'linked-account': linkedAccount, 'patreon-tier': patreonTier }) =>
            (linkedAccount.discord === user.id && Boolean(patreonTier)) ||
            (roles instanceof GuildMemberRoleManager
                ? roles.cache.hasAny(...patreonRolesIds)
                : roles.some(id => patreonRolesIds.includes(id)))
    );

    if (
        now - userCooldown <=
        (userIsDonator ? cooldown.donator : cooldown.default)
    ) {
        await interaction.reply({
            content: (!interaction.isCommand() && user.toString()) || undefined,
            embeds: [
                new MessageEmbed()
                    .setTitle('Slow Down!')
                    .setColor('#6ba4a5')
                    .setDescription(
                        `Your command is still on \`${parseMsIntoReadableText(
                            (userIsDonator
                                ? cooldown.donator
                                : cooldown.default) -
                                (now - userCooldown)
                        )}\` cooldown.${
                            cooldown.donator === cooldown.default
                                ? ''
                                : ` ${
                                      userIsDonator
                                          ? 'Since you are a [Patreon donator](https://www.patreon.com/RandomDiceCommunityWebsite), your cooldown is reduced'
                                          : '[Patreon donators](https://www.patreon.com/RandomDiceCommunityWebsite) can have their command cooldown reduced'
                                  } from \`${parseMsIntoReadableText(
                                      cooldown.default
                                  )}\` to \`${parseMsIntoReadableText(
                                      cooldown.donator
                                  )}\`${
                                      userIsDonator
                                          ? ''
                                          : `\nIf you have subscribed to patreon, please login and link your account on [randomdice.gg website](${randomDiceWebsiteUrl()}).`
                                  }`
                        }`
                    )
                    .setFooter({
                        text: userIsDonator
                            ? 'Nice You are a donator!'
                            : randomDiceWebsiteUrl('/about/patreon'),
                    }),
            ],
        });
        return true;
    }

    commandCooldown.set(commandName, commandCooldownList.set(user.id, now));
    return false;
}

export default Cooldown;
