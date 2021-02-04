/* eslint-disable no-nested-ternary */
export default function parseMsIntoReadableText(
    ms: number,
    longString?: true
): string {
    const year = Math.floor(ms / (1000 * 60 * 60 * 24 * 365));
    const month = Math.floor(
        (ms % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30)
    );
    const week = Math.floor(
        (ms % (1000 * 60 * 60 * 24 * 30)) / (1000 * 60 * 60 * 24 * 7)
    );
    const day = Math.floor(
        (ms % (1000 * 60 * 60 * 24 * 7)) / (1000 * 60 * 60 * 24)
    );
    const hour = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minute = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    const tenthseconds = Math.floor((ms % 1000) / 100);

    const parseString = (time: number, str: string): string =>
        time > 0
            ? `${time}${longString ? (time > 1 ? `${str}s` : str) : str[0]} `
            : '';
    const yearString = parseString(year, 'year');
    const monthString = parseString(month, 'month');
    const weekString = parseString(week, 'week');
    const dayString = parseString(day, 'day');
    const hourString = parseString(hour, 'hour');
    const minuteString = parseString(minute, 'minute');
    const secondString = `${seconds > 0 || tenthseconds > 0 ? seconds : ''}${
        tenthseconds > 0 ? `.${tenthseconds}` : ''
    }${
        seconds > 0 || tenthseconds > 0
            ? longString
                ? seconds > 1
                    ? 'seconds'
                    : 'second'
                : 's'
            : ''
    }`;

    return `${yearString}${monthString}${weekString}${dayString}${hourString}${minuteString}${secondString}`.trim();
}
