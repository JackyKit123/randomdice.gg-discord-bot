import firebase from 'firebase-admin';
import Discord from 'discord.js';
import cache from '../util/cache';

// interface Brackets {
//     left: Brackets | null;
//     right: Brackets | null;
//     player: Discord.GuildMember;
// }

let tournamentState: 'none' | 'upcoming' | 'preparing' | 'ongoing' | 'ended' =
    'none';
let tournamentCountdownTimeout: NodeJS.Timeout;

// function makeBrackets(
//     participants: Discord.GuildMember[],
//     initial?: true
// ): Brackets {
//     // const rounds = Math.ceil(Math.log(participants.length) / Math.log(2));
//     if (initial)
//         for (let i = participants.length - 1; i > 0; i -= 1) {
//             const j = Math.floor(Math.random() * (i + 1));
//             // eslint-disable-next-line no-param-reassign
//             [participants[i], participants[j]] = [
//                 participants[j],
//                 participants[i],
//             ];
//         }
//     return {
//         left:
//             participants.length > 2
//                 ? makeBrackets(
//                       participants.slice(0, Math.ceil(participants.length / 2))
//                   )
//                 : null,
//         right:
//             participants.length > 2
//                 ? makeBrackets(
//                       participants.slice(
//                           Math.ceil(participants.length / 2),
//                           participants.length
//                       )
//                   )
//                 : null,
//         player: participants[0],
//     };
// }

function countdownToTournament(
    timestamp: number,
    channel: Discord.TextChannel
): void {
    tournamentState = 'upcoming';
    if (tournamentState) clearTimeout(tournamentCountdownTimeout);
    tournamentCountdownTimeout = setTimeout(async () => {
        await channel.send('Tournament Registration begins');
        tournamentState = 'preparing';
    }, timestamp - 30 * 60 * 1000);
}

async function hostTournament(
    message: Discord.Message,
    database: firebase.database.Database
): Promise<void> {
    const { member, channel } = message;
    if (!member) return;
    if (
        !member.roles.cache.has('805000661133295616') &&
        !member.roles.cache.has('805772165394858015') &&
        !member.permissions.has('ADMINISTRATOR')
    ) {
        await channel.send('You do not have permission to host a tournament.');
        return;
    }
    if (tournamentState === 'upcoming') {
        await channel.send(
            'There is an upcoming tournament, please force end it before you can host a new one.'
        );
        return;
    }
    if (tournamentState === 'ongoing' || tournamentState === 'preparing') {
        await channel.send(
            'A tournament is running right now, please wait after this one is finished'
        );
        return;
    }
    await channel.send(
        'When will be the tournament? Please respond in `yyyy-mm-dd hh:mm`, timezone will be according to UTC.'
    );
    const matchDateRegex = /^(\d{4})-([0=1]\d)-([0-3]\d) ([0-2]\d):([0-5]\d)$/;
    try {
        const awaitedMessage = (
            await channel.awaitMessages(
                msg =>
                    msg.author.id === member.id &&
                    matchDateRegex.test(msg.content),
                {
                    time: 1000 * 60,
                    max: 1,
                    errors: ['time'],
                }
            )
        ).first();
        if (!awaitedMessage) throw new Error();
        const regexMatchArr = awaitedMessage.content.match(matchDateRegex);
        if (!regexMatchArr) throw new Error();
        const [, year, month, date, hour, minute] = regexMatchArr.map(str =>
            Number(str)
        );
        const finalDate =
            new Date(0).setUTCFullYear(year) +
            new Date(0).setUTCMonth(month - 1) +
            new Date(0).setUTCDate(date) +
            new Date(0).setUTCHours(hour) +
            new Date(0).setUTCMinutes(minute);
        if (finalDate + 60 * 60 * 1000 < new Date().valueOf()) {
            await channel.send(
                'The desired date should be at least 1 hour from now.'
            );
            return;
        }
        await channel.send(
            `Tournament will be hosted on ${new Date(
                finalDate
            ).toUTCString()}, registration will begin 30 minutes before this time.`
        );
        await database
            .ref('/discord_bot/community/tournament/timestamp')
            .set(finalDate);
        countdownToTournament(finalDate, channel as Discord.TextChannel);
    } catch (err) {
        await channel.send('You did not response a valid date in time.');
    }
}

export async function fetchTournamentTimer(
    client: Discord.Client
): Promise<void> {
    const data = cache['discord_bot/community/tournament'];
    const channel = (
        await client.guilds.fetch('804222694488932362')
    ).channels.cache // TODO: change to tournament info
        .get('804640084007321600');
    if (channel?.isText())
        countdownToTournament(data.timestamp, channel as Discord.TextChannel);
}

async function killTournament(
    message: Discord.Message,
    database: firebase.database.Database
): Promise<void> {
    const { member, channel } = message;
    if (!member) return;
    if (
        !member.roles.cache.has('805000661133295616') &&
        !member.roles.cache.has('805772165394858015') &&
        !member.permissions.has('ADMINISTRATOR')
    ) {
        await channel.send(
            'You do not have permission to stop the tournament.'
        );
        return;
    }
    if (tournamentState === 'none' || tournamentState === 'ended') {
        await channel.send('There is no active tournament.');
        return;
    }
    await channel.send(
        'Are you sure you are going to forcefully end this tournament? This action is irreversible.'
    );
    const awaitedMessage = (
        await channel.awaitMessages(
            msg =>
                msg.author.id === member.id &&
                /^(yes|y|no?)$/.test(msg.content),
            {
                time: 1000 * 60,
                max: 1,
            }
        )
    ).first();
    if (!awaitedMessage?.content.startsWith('y')) {
        await channel.send('Ok we are not killing a tournament today.');
        return;
    }
    database.ref('/discord_bot/community/tournament/').set(null);
    await channel.send(`${member} has killed this tournament.`);
    if (tournamentCountdownTimeout) clearTimeout(tournamentCountdownTimeout);
    tournamentState = 'none';
    // TODO: add cleanup function for preparing state etc
}

export default async function tournamentCommands(
    message: Discord.Message,
    database: firebase.database.Database
): Promise<void> {
    const { content, member, guild } = message;
    const [, subCommand] = content.split(' ');

    if (!member || !guild) return;

    switch (subCommand?.toLowerCase()) {
        case 'host':
            hostTournament(message, database);
            break;
        case 'join':
            //
            break;
        case 'info':
            //
            break;
        case 'kill':
            killTournament(message, database);
            break;
        default:
            // wrong command handler
            break;
    }
}
