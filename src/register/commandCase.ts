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
import snipe from 'community discord/snipe';
import apply, { configApps } from 'community discord/apply';
import { report, closeReport } from 'community discord/report';
import lock from 'community discord/lock';
import timer, { hackwarnTimer } from 'community discord/timer';
import lfg from 'community discord/lfg';
import gtn from 'community discord/gtn';
import eventPing from 'community discord/eventping';
import customRole from 'community discord/customRole';
import myEmoji from 'community discord/myEmoji';
import { rdRole } from 'community discord/rdRole';
import advertise from 'community discord/promote';
import drawDice from 'community discord/currency/drawDice';
import balance from 'util/getBalance';
import profile from 'community discord/currency/profile';
import coinflip from 'community discord/currency/coinflip';
import leaderboard from 'community discord/currency/leaderboard';
import prestige from 'community discord/currency/prestige';
import raffle from 'community discord/currency/raffle';
import timed from 'community discord/currency/timed';
import currency from 'community discord/currency/currency';
import { spawnCoinbomb } from 'community discord/currency/coinbomb';
import multiplier from 'community discord/currency/multiplier';
import bon from 'community discord/currency/fun commands/bon';
import welcomerick from 'community discord/currency/fun commands/welcomerick';
import afk from 'community discord/afk';
import bedtime from 'community discord/currency/fun commands/bedtime';
import yomama from 'community discord/currency/fun commands/yomama';
import moon from 'community discord/currency/fun commands/moon';
import clown from 'community discord/currency/fun commands/clown';
import shush, { unShush } from 'community discord/currency/fun commands/shush';
import rickbomb from 'community discord/currency/fun commands/rickbomb';
import givemoney from 'community discord/currency/fun commands/mudkipz';
import wordle from 'community discord/wordle';

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

export async function communityServerCommands(
    input: CommandInteraction | Message,
    commandName: string
): Promise<void> {
    switch (commandName) {
        case 'snipe':
        case 'editsnipe':
            return snipe(input);
        case 'application':
            return configApps(input);
        case 'apply':
            return apply(input);
        case 'report':
            return report(input);
        case 'closereport':
            return closeReport(input);
        case 'lock':
        case 'unlock':
            return lock(input);
        case 'timer':
            return timer(input);
        case 'hackwarn':
            return hackwarnTimer(input);
        case 'lfg':
            return lfg(input);
        case 'gtn':
            return gtn(input);
        case 'eventping':
            return eventPing(input);
        case 'customrole':
            return customRole(input);
        case 'myemoji':
            return myEmoji(input);
        case 'myclass':
        case 'mycrit':
            return rdRole(input);
        case 'promote':
        case 'advertise':
            return advertise(input);
        case 'dd':
        case 'drawdice':
        case 'dicedraw':
            return drawDice(input);
        case 'wordle':
            return wordle(input);
        case 'bal':
        case 'balance':
            return new Promise(r => balance(input, 'emit').then(() => r()));
        case 'rank':
        case 'profile':
        case 'stat':
        case 'p':
            return profile(input);
        case 'coinflip':
        case 'cf':
            return coinflip(input);
        case 'richest':
        case 'leaderboard':
        case 'lb':
            return leaderboard(input);
        case 'prestige':
            return prestige(input);
        case 'raffle':
            return raffle(input);
        case 'hourly':
            return timed(input, 'hourly');
        case 'daily':
            return timed(input, 'daily');
        case 'weekly':
            return timed(input, 'weekly');
        case 'monthly':
            return timed(input, 'monthly');
        case 'yearly':
            return timed(input, 'yearly');
        case 'currency':
            return currency(input);
        case 'coinbomb':
            return spawnCoinbomb(input);
        case 'multi':
        case 'multiplier':
            return multiplier(input);
        case 'bon':
            return bon(input);
        case 'welcomerick':
            return welcomerick(input);
        case 'afk':
            return afk(input);
        case 'bedtime':
            return bedtime(input);
        case 'yomama':
            return yomama(input);
        case 'moon':
            return moon(input);
        case 'clown':
            return clown(input);
        case 'shush':
            return shush(input);
        case 'unshush':
            return unShush(input);
        case 'rickbomb':
        case 'rickcoin':
            return rickbomb(input);
        case 'givemoney':
            return givemoney(input);
        case 'help':
            return help(input, true);
        default:
            return new Promise(r => r());
    }
}
