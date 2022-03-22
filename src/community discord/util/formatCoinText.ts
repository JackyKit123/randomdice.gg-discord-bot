import { coinDice, rickCoin } from 'config/emojiId';

const numberFormat = new Intl.NumberFormat();

export default (amount: number): string =>
    `${coinDice} ${numberFormat.format(amount)}`;

export const rickCoinText = (amount: number): string =>
    `${rickCoin} ${numberFormat.format(amount)}`;
