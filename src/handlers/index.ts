import { Client } from 'discord.js';
import guildCreate from './guildCreate';
import interactionCreate from './interactionCreate';
import messageCreate from './messageCreate';
import messageDelete from './messageDelete';
import messageReactionAdd from './messageReactionAdd';
import messageUpdate from './messageUpdate';
import ready from './ready';
import typingStart from './typingStart';

export default function botEventHandlers(client: Client): void {
    client
        .on('ready', ready)
        .on('messageCreate', messageCreate)
        .on('interactionCreate', interactionCreate)
        .on('guildCreate', guildCreate)
        .on('messageReactionAdd', messageReactionAdd)
        .on('messageDelete', messageDelete)
        .on('messageUpdate', messageUpdate)
        .on('typingStart', typingStart);
}
