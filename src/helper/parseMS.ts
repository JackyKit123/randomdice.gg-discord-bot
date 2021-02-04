export default function parseMsIntoReadableText(ms: number): string {
    const day = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hour = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minute = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    const tenthseconds = Math.floor((ms % 1000) / 100);

    return `${day > 0 ? `${day}d ` : ''}${hour > 0 ? `${hour}h ` : ''}${
        minute > 0 ? `${minute}m ` : ''
    }${seconds > 0 || tenthseconds > 0 ? seconds : ''}${
        tenthseconds > 0 ? `.${tenthseconds}` : ''
    }${seconds > 0 || tenthseconds > 0 ? 's' : ''}`.trim();
}
