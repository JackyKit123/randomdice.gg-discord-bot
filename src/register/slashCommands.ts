import { ApplicationCommandDataResolvable, Client } from 'discord.js';
import { commandData as boss } from 'commands/boss';
import { commandData as battlefield } from 'commands/battlefield';
import { commandData as ping } from 'commands/ping';
import { commandData as dice } from 'commands/dice';
import { commandData as deck } from 'commands/deck';
import { commandData as cardcalc } from 'commands/cardcalc';
import { commandData as drawUntil } from 'commands/drawUntil';
import { commandData as guide } from 'commands/guide';
import { commandData as help } from 'commands/help';
import { commandData as news } from 'commands/news';
import { commandData as randomDeck } from 'commands/randomdeck';
import { commandData as contact } from 'commands/sendContact';
import { commandData as postNow } from 'commands/postNow';
import { commandData as register } from 'commands/register';
import { commandData as links } from 'commands/sendLinks';

export default async function registerSlashCommands(
    client: Client
): Promise<void> {
    const commands: ApplicationCommandDataResolvable[] = [
        boss,
        battlefield,
        cardcalc,
        deck,
        dice,
        ping,
        drawUntil,
        guide,
        help,
        news,
        randomDeck,
        contact,
        postNow,
        ...register,
        ...links,
    ];

    const setCommands = async (guildId = '') => {
        if (guildId) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) return guild.commands.set(commands);
        }
        return client.application?.commands.set(commands);
    };

    if (process.env.NODE_ENV === 'development') {
        await setCommands(process.env.DEV_SERVER_ID);
    } else if (process.env.NODE_ENV === 'production') {
        await Promise.all([
            setCommands(process.env.DEV_SERVER_ID),
            setCommands(process.env.COMMUNITY_SERVER_ID ?? ''),
            setCommands(process.env.COMMUNITY_APPEAL_SERVER_ID ?? ''),
            setCommands(),
        ]);
    }
}
