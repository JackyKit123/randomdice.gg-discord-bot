import * as textVersion from 'textversionjs';

export default function replace(originalText: string): string {
    let output = originalText;

    const escapeDiscordMarkdown = {
        '\\*': '\\*',
        '~': '\\~',
        _: '\\_',
        '`': '\\`',
    };

    const escapeHTML = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '\\>',
        '&quot;': '"',
        '&#39;': "'",
        '&#x2F;': '/',
        '<i>': '*',
        '</i>': '*',
        '<b>': '**',
        '</b>': '**',
        '<strong>': '**',
        '</strong>': '**',
    };
    [
        ...Object.entries(escapeDiscordMarkdown),
        ...Object.entries(escapeHTML),
    ].forEach(([code, character]) => {
        output = output.replace(new RegExp(code, 'g'), character);
    });
    const parsedHtml = textVersion(output, {
        linkProcess: (href, linkText) => linkText,
    });

    return parsedHtml;
}
