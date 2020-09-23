import * as Discord from 'discord.js';
import * as admin from 'firebase-admin';
import * as textVersion from 'textversionjs';

interface Alternatives {
    desc: string;
    list: Array<Dice['name']>;
}

interface ArenaValue {
    type: 'Main Dps' | 'Assist Dps' | 'Slow' | 'Value';
    assist: number;
    dps: number;
    slow: number;
    value: number;
}

interface Dice {
    id: number;
    name: string;
    type: 'Physical' | 'Magic' | 'Buff' | 'Merge' | 'Transform';
    desc: string;
    detail: string;
    img: string;
    target: 'Front' | 'Strongest' | 'Random' | 'Weakest' | '-';
    rarity: 'Common' | 'Rare' | 'Unique' | 'Legendary';
    atk: number;
    spd: number;
    eff1: number;
    eff2: number;
    nameEff1: string;
    nameEff2: string;
    unitEff1: string;
    unitEff2: string;
    cupAtk: number;
    cupSpd: number;
    cupEff1: number;
    cupEff2: number;
    pupAtk: number;
    pupSpd: number;
    pupEff1: number;
    pupEff2: number;
    alternatives?: Alternatives;
    arenaValue: ArenaValue;
}

export type Dices = Dice[];

export default async function dice(
    message: Discord.Message,
    database: admin.database.Database
): Promise<void> {
    const { channel, content } = message;
    const [diceName, ...args] = content.replace(/^\.gg dice /, '').split(' ');
    const diceList = (await database.ref('/dice').once('value')).val() as Dices;
    const die = diceList.find(d =>
        d.name.toLowerCase().startsWith(diceName.toLowerCase())
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
        ) || 0;
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
            .setDescription(textVersion(die.detail))
            .setThumbnail(die.img)
            .setAuthor(
                'Random Dice Community Website',
                'https://randomdice.gg/title_dice.png',
                'https://randomdice.gg/'
            )
            .setColor('#6ba4a5')
            .setURL(`https://randomdice.gg/wiki/dice_mechanics#${diceName}`)
            .addFields([
                {
                    name: 'Attack Damage',
                    value: atk || '-',
                },
                {
                    name: 'Type',
                    value: die.type,
                },
                {
                    name: 'Attack Speed',
                    value: spd ? `${spd}s` : '-',
                },
                {
                    name: 'Target',
                    value: die.target,
                },
                ...(!die.nameEff1 || die.nameEff1 === '-'
                    ? []
                    : [
                          {
                              name: die.nameEff1,
                              value: eff1 + die.unitEff1,
                          },
                      ]),
                ...(!die.nameEff2 || die.nameEff2 === '-'
                    ? []
                    : [
                          {
                              name: die.nameEff2,
                              value: eff2 + die.unitEff2,
                          },
                      ]),
            ])
            .setFooter(
                'randomdice.gg Dice Information',
                'https://randomdice.gg/title_dice.png'
            )
    );
}
