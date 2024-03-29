import { Client, Emoji } from 'discord.js';
import { getCommunityDiscord, getDevTestDiscord } from './guild';

export const nullDice = '<:Dice_TierX_Null:807019807312183366>';
export const coinDice = '<:dicecoin:839981846419079178>';
export const shuffleDice = '<a:Dice_TierX_RandomCommon:830670733004242974>';
export const timeDice = '<:Dice_Tier4_Time:804524690440847381>';
export const shuffleDiceLegendary =
    '<a:Dice_TierX_RandomLegend:867076479733334016>';

export const pickaxe = '<:pickaxe:898343065511665695>';
export const goldenPickaxe = '<a:golden_pickaxe:898329291786440785>';

export const clown = '<a:clowndance:845532985787940894>';

export const rickCoin = '<a:Dice_TierX_RickCoin:827059872810008616>';

export const pokeball = '<:pokeball:820533431217815573>';

export const banHammer = '<:banned:868148038311489578>';

export const alert = '<a:alert:952779096314757211>';

export const nuke = '<a:nuke:952781322051530813>';
export const nukeWaste = '<:nuclear_waste:952796890154549308>';

export const getCoinDiceEmoji = (client: Client): Emoji | undefined =>
    getDevTestDiscord(client).emojis.cache.find(
        emoji => emoji.toString() === coinDice
    );

export const getTimeDiceEmoji = (client: Client): Emoji | undefined =>
    getCommunityDiscord(client).emojis.cache.find(
        emoji => emoji.toString() === timeDice
    );
