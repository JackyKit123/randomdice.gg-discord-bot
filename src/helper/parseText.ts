import * as textVersion from 'textversionjs';
import { XmlEntities } from 'html-entities';

export default function replace(originalText: string): string {
    const entities = new XmlEntities();
    let output = originalText;

    const escapeDiscordMarkdown = {
        '\\*': '\\*',
        '~': '\\~',
        _: '\\_',
        '`': '\\`',
        '\\|': '\\|',
    };

    const escapeHTML = {
        '<blockquote>': '```',
        '</blockquote>': '```',
        '<u>': '__',
        '</u>': '__',
        '<i>': '*',
        '</i>': '*',
        '<b>': '**',
        '</b>': '**',
        '<strong>': '**',
        '</strong>': '**',
    };
    output = entities.decode(output);
    [
        ...Object.entries(escapeDiscordMarkdown),
        ...Object.entries(escapeHTML),
    ].forEach(([code, character]) => {
        output = output.replace(new RegExp(code, 'g'), character);
    });
    output = textVersion(output, {
        linkProcess: (href, linkText) => linkText,
        imgProcess: img => `{img}${img}{/img}`,
        uIndentionChar: '• ',
        oIndentionChar: '. ',
        listIndentionTabs: 1,
        keepNbsps: true,
    });
    output = output.replace(/>/g, '\\>');

    return output;
}
