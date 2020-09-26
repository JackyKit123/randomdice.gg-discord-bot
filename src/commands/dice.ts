import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import cache, { Dice } from '../helper/cache';
import parsedText from '../helper/parseText';

export default async function dice(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { channel, content } = message;
    const [diceName, ...args] = content.replace(/^\.gg dice ?/, '').split(' ');
    if (!diceName) {
        await channel.send(
            'Please include the dice name in command parameter.'
        );
        return;
    }
    const diceList = (await cache(database, 'dice')) as Dice[];
    const die = diceList.find(d =>
        [diceName, ...args]
            .join(' ')
            .toLowerCase()
            .startsWith(d.name.toLowerCase())
    );
    if (!die) {
        await channel.send(`Dice \`${diceName}\` is not a valid dice.`);
        return;
    }

    let minClass: number;
    switch (die.rarity) {
        case 'Legendary':
            minClass = 7;
            break;
        case 'Unique':
            minClass = 5;
            break;
        case 'Rare':
            minClass = 3;
            break;
        default:
            minClass = 1;
    }
    const dieClass =
        Number(
            args
                .find(arg => arg.match(/^(-c|--class)=(1?[0-5]|[1-9])$/))
                ?.split('=')[1]
        ) || minClass;
    const dieLevel =
        Number(
            args.find(arg => arg.match(/^(-l|--level)=[1-5]$/))?.split('=')[1]
        ) || 1;
    if (dieClass < minClass) {
        await channel.send(
            `${die.name} dice is in ${die.rarity} tier, its minimum class is ${minClass}.`
        );
        return;
    }
    const atk =
        Math.floor(
            (die.atk +
                die.cupAtk * (dieClass - minClass) +
                die.pupAtk * (dieLevel - 1)) *
                100
        ) / 100;
    const spd =
        Math.floor(
            (die.spd +
                die.cupSpd * (dieClass - minClass) +
                die.pupSpd * (dieLevel - 1)) *
                100
        ) / 100;
    const eff1 =
        Math.floor(
            (die.eff1 +
                die.cupEff1 * (dieClass - minClass) +
                die.pupEff1 * (dieLevel - 1)) *
                100
        ) / 100;
    const eff2 =
        Math.floor(
            (die.eff2 +
                die.cupEff2 * (dieClass - minClass) +
                die.pupEff2 * (dieLevel - 1)) *
                100
        ) / 100;

    await channel.send(
        new Discord.MessageEmbed()
            .setTitle(`${die.name} Dice`)
            .setDescription(parsedText(die.detail))
            .setThumbnail(die.img)
            .setAuthor(
                'Random Dice Community Website',
                'https://randomdice.gg/title_dice.png',
                'https://randomdice.gg/'
            )
            .setColor('#6ba4a5')
            .setURL(`https://randomdice.gg/wiki/dice_mechanics`)
            .addFields([
                {
                    name: 'Attack Damage',
                    value: atk || '-',
                    inline: true,
                },
                {
                    name: 'Type',
                    value: die.type,
                    inline: true,
                },
                {
                    name: 'Attack Speed',
                    value: spd ? `${spd}s` : '-',
                    inline: true,
                },
                {
                    name: 'Target',
                    value: die.target,
                    inline: true,
                },
                ...(!die.nameEff1 || die.nameEff1 === '-'
                    ? []
                    : [
                          {
                              name: die.nameEff1,
                              value: eff1 + die.unitEff1,
                              inline: true,
                          },
                      ]),
                ...(!die.nameEff2 || die.nameEff2 === '-'
                    ? []
                    : [
                          {
                              name: die.nameEff2,
                              value: eff2 + die.unitEff2,
                              inline: true,
                          },
                      ]),
            ])
            .setFooter(
                'randomdice.gg Dice Information',
                'https://randomdice.gg/title_dice.png'
            )
    );
}
