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
): Promise<boolean> {
    switch (commandName?.toLowerCase()) {
        case 'ping':
            await ping(input);
            break;
        case 'register':
            await register(input);
            break;
        case 'unregister':
            await unregister(input);
            break;
        case 'postnow':
        case 'post-now':
            await postNow(input);
            break;
        case 'dice':
            await dice(input);
            break;
        case 'guide':
            await guide(input);
            break;
        case 'deck':
            await deck(input);
            break;
        case 'boss':
            await boss(input);
            break;
        case 'battlefield':
            await battlefield(input);
            break;
        case 'news':
            await news(input);
            break;
        case 'cardcalc':
            await cardcalc(input);
            break;
        case 'drawuntil':
        case 'draw-until':
            await drawUntil(input);
            break;
        case 'randomdeck':
            await randomdeck(input);
            break;
        case 'help':
            await help(input);
            break;
        case 'website':
        case 'app':
        case 'invite':
        case 'support':
            await sendLinks(input);
            break;
        case 'contact':
            await sendContact(input);
            break;
        default:
            return false;
    }
    return true;
}
