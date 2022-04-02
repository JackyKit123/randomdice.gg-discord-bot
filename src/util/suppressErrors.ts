import { Constants, DiscordAPIError } from 'discord.js';

export const suppressCannotDmUser = (error: DiscordAPIError): null => {
    if (error.code !== Constants.APIErrors.CANNOT_MESSAGE_USER) throw error;
    return null;
};

export const suppressUnknownBan = (error: DiscordAPIError): null => {
    if (error.code !== Constants.APIErrors.UNKNOWN_BAN) throw error;
    return null;
};

export const suppressUnknownUser = (error: DiscordAPIError): null => {
    if (error.code !== Constants.APIErrors.UNKNOWN_USER) throw error;
    return null;
};

export const suppressUnknownMember = (error: DiscordAPIError): null => {
    if (error.code !== Constants.APIErrors.UNKNOWN_MEMBER) throw error;
    return null;
};

export const suppressUnknownMessage = (error: DiscordAPIError): null => {
    if (error.code !== Constants.APIErrors.UNKNOWN_MESSAGE) throw error;
    return null;
};

export const suppressUnknownInteraction = (error: DiscordAPIError): null => {
    if (error.code !== Constants.APIErrors.UNKNOWN_INTERACTION) throw error;
    return null;
};

export const suppressReactionBlocked = (error: DiscordAPIError): null => {
    if (error.code !== Constants.APIErrors.REACTION_BLOCKED) throw error;
    return null;
};

export const suppressUnknownChannel = (error: DiscordAPIError): null => {
    if (error.code !== Constants.APIErrors.UNKNOWN_CHANNEL) throw error;
    return null;
};

export const suppressMissingAccess = (error: DiscordAPIError): null => {
    if (error.code !== Constants.APIErrors.MISSING_ACCESS) throw error;
    return null;
};

export const suppressMissingPermission = (error: DiscordAPIError): null => {
    if (error.code !== Constants.APIErrors.MISSING_PERMISSIONS) throw error;
    return null;
};
