import { Client, Guild } from 'discord.js';

export const communityDiscordId = '804222694488932362';
export const banAppealDiscordId = '805035618765242368';
export const devTestDiscordId = '757766842767900753';
export const hackDiscordsId = ['818961659086766111'];

export const isCommunityDiscord = (guild: Guild | null): guild is Guild =>
    guild?.id === communityDiscordId;

export const isBanAppealDiscord = (guild: Guild | null): guild is Guild =>
    guild?.id === banAppealDiscordId;

export const isDevTestDiscord = (guild: Guild | null): guild is Guild =>
    guild?.id === devTestDiscordId;

export const isHackDiscord = (guild: Guild | null): guild is Guild =>
    guild instanceof Guild && hackDiscordsId.includes(guild.id);

const notFoundString =
    'server not found, either bot is not in a guild or guild id is incorrect.';

export const getCommunityDiscord = (client: Client): Guild => {
    const guild = client.guilds.cache.get(communityDiscordId);
    if (!guild) throw new Error(`Community ${notFoundString}`);
    return guild;
};

export const getBanAppealDiscord = (client: Client): Guild => {
    const guild = client.guilds.cache.get(banAppealDiscordId);
    if (!guild) throw new Error(`Ban Appeal ${notFoundString}`);
    return guild;
};

export const getDevTestDiscord = (client: Client): Guild => {
    const guild = client.guilds.cache.get(devTestDiscordId);
    if (!guild) throw new Error(`Dev Test ${notFoundString}`);
    return guild;
};
