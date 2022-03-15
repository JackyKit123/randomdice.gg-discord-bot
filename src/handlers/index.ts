import { Client } from 'discord.js';
import guildBanAdd from './guildBanAdd';
import guildBanRemove from './guildBanRemove';
import guildCreate from './guildCreate';
import guildMemberAdd from './guildMemberAdd';
import guildMemberRemove from './guildMemberRemove';
import interactionCreate from './interactionCreate';
import guildMemberUpdate from './guildMemberUpdate';
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
        .on('guildMemberAdd', guildMemberAdd)
        .on('guildMemberRemove', guildMemberRemove)
        .on('messageReactionAdd', messageReactionAdd)
        .on('messageDelete', messageDelete)
        .on('messageUpdate', messageUpdate)
        .on('typingStart', typingStart)
        .on('guildBanAdd', guildBanAdd)
        .on('guildBanRemove', guildBanRemove)
        .on('guildMemberUpdate', guildMemberUpdate);
}
