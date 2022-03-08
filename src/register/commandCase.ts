import { CommandInteraction, Message } from 'discord.js';
import battlefield from 'commands/battlefield';
import dice from 'commands/dice';
import boss from 'commands/boss';
import cardcalc from 'commands/cardcalc';
import deck from 'commands/deck';
import drawUntil from 'commands/drawUntil';
import guide from 'commands/guide';
import help from 'commands/help';
import news from 'commands/news';
import ping from 'commands/ping';
import postNow from 'commands/postNow';
import randomdeck from 'commands/randomdeck';
import { register, unregister } from 'commands/register';
import sendContact from 'commands/sendContact';
import sendLinks from 'commands/sendLinks';

// eslint-disable-next-line import/prefer-default-export
export async function baseCommands(
    input: CommandInteraction | Message,
    commandName: string
): Promise<'no match' | void> {
    switch (commandName?.toLowerCase()) {
        case 'ping':
            return ping(input);
        case 'register':
            return register(input);
        case 'unregister':
            return unregister(input);
        case 'postnow':
        case 'post-now':
            return postNow(input);
        case 'dice':
            return dice(input);
        case 'guide':
            return guide(input);
        case 'deck':
            return deck(input);
        case 'boss':
            return boss(input);
        case 'battlefield':
            return battlefield(input);
        case 'news':
            return news(input);
        case 'cardcalc':
            return cardcalc(input);
        case 'drawuntil':
        case 'draw-until':
            return drawUntil(input);
        case 'randomdeck':
            return randomdeck(input);
        case 'help':
            return help(input);
        case 'website':
        case 'app':
        case 'invite':
        case 'support':
            return sendLinks(input);
        case 'contact':
            return sendContact(input);
        default:
            return 'no match';
    }
}
