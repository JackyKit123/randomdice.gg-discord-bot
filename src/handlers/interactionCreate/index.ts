import { Interaction } from 'discord.js';
import drawDice from 'community discord/currency/drawDice';
import logMessage from 'dev-commands/logMessage';
import ping from 'commands/ping';
import dice from 'commands/dice';
import { register, unregister } from 'commands/register';
import postNow from 'commands/postNow';
import guide from 'commands/guide';
import deck from 'commands/deck';
import boss from 'commands/boss';
import battlefield from 'commands/battlefield';
import news from 'commands/news';
import drawUntil from 'commands/drawUntil';
import cardcalc from 'commands/cardcalc';
import randomdeck from 'commands/randomdeck';
import help from 'commands/help';
import sendLinks from 'commands/sendLinks';
import sendContact from 'commands/sendContact';

export default async function interactionCreate(
    interaction: Interaction
): Promise<void> {
    const { guildId, user, channelId, guild, client } = interaction;

    if (
        // ignoring other servers in development, ignoring dev channel in production
        (process.env.DEV_SERVER_ID &&
            process.env.NODE_ENV === 'development' &&
            guildId !== process.env.DEV_SERVER_ID &&
            channelId !== '804640084007321600') ||
        (process.env.NODE_ENV === 'production' &&
            guildId === process.env.DEV_SERVER_ID)
    ) {
        return;
    }

    try {
        if (interaction.isMessageComponent()) {
            switch (interaction.customId) {
                case 'dd':
                    await drawDice(interaction);
                    break;
                default:
                    break;
            }
        }
        if (interaction.isCommand()) {
            switch (interaction.commandName) {
                case 'ping': {
                    await ping(interaction);
                    break;
                }
                case 'register': {
                    await register(interaction);
                    break;
                }
                case 'unregister': {
                    await unregister(interaction);
                    break;
                }
                case 'postnow':
                case 'post-now': {
                    await postNow(interaction);
                    break;
                }
                case 'dice': {
                    await dice(interaction);
                    break;
                }
                case 'guide': {
                    await guide(interaction);
                    break;
                }
                case 'deck': {
                    await deck(interaction);
                    break;
                }
                case 'boss': {
                    await boss(interaction);
                    break;
                }
                case 'battlefield': {
                    await battlefield(interaction);
                    break;
                }
                case 'news': {
                    await news(interaction);
                    break;
                }
                case 'cardcalc': {
                    await cardcalc(interaction);
                    break;
                }
                case 'drawuntil':
                case 'draw-until': {
                    await drawUntil(interaction);
                    break;
                }
                case 'randomdeck': {
                    await randomdeck(interaction);
                    break;
                }
                case 'help': {
                    await help(interaction);
                    break;
                }
                case 'website':
                case 'app':
                case 'invite':
                case 'support':
                    await sendLinks(interaction);
                    break;
                case 'contact':
                    await sendContact(interaction);
                    break;
                default:
            }
        }
    } catch (err) {
        try {
            await logMessage(
                client,
                `Oops, something went wrong in ${
                    guild ? `server ${guild.name}` : `DM with <@${user.id}>`
                } : ${
                    (err as Error).stack ?? (err as Error).message ?? err
                }\nwhen executing interaction`
            );
        } catch (criticalError) {
            // eslint-disable-next-line no-console
            console.error(criticalError);
        }
    }
}
