const roleIds = {
    Admin: '804223328709115944',
    'bot-permission': '804223854352138250',
    Moderator: '804223928427216926',
    'Trial Moderator': '807219483311603722',
    rick: '892634239290445824',
    'Bed time': '804223995025162280',
    'Event Manager': '805000661133295616',
    'Trial Event Manager': '805772165394858015',
    Giveaways: '815313811133169714',
    'Website Staff': '804303208372633651',
    '🤡': '845530033695096853',
    'Server Artist': '804945286606749696',
    'Tournament Champion': '822644724615086080',
    '$50 Patreon': '805727466219372546',
    '$20 Patreon': '804513117228367882',
    '$10 Patreon': '804513079319592980',
    '$5 Patreon': '804512584375599154',
    'Weekly Top 5': '805388604791586826',
    'Prestige X': '809143588105486346',
    'Prestige IX': '809143390791925780',
    'Prestige VIII': '809143374555774997',
    'Prestige VII': '809143362938339338',
    'Prestige VI': '809142968434950201',
    'Prestige V': '809142956715671572',
    'Prestige IV': '809142950117245029',
    'Prestige III': '806896441947324416',
    'Prestige II': '806896328255733780',
    'Prestige I': '806312627877838878',
    '100 Daily Streaks': '847777372745105438',
    'Server Booster': '804231753535193119',
    Voted: '804642685095772181',
    'Golden Class Champion 3': '857459958685499423',
    'Golden Class Champion 2': '892925069586743316',
    'Golden Class Champion 1': '892925074234028073',
    'Golden Class Challenger 3': '844364197592694805',
    'Golden Class Challenger 2': '892924559156707398',
    'Golden Class Challenger 1': '892924562642198549',
    'Golden Class Master 3': '844364171147476992',
    'Golden Class Master 2': '892925705418072105',
    'Golden Class Master 1': '892925710417670184',
    'Golden Class Grand 3': '844363924576141322',
    'Golden Class Grand 2': '892926124345159701',
    'Golden Class Grand 1': '892926128140996719',
    'Class 20': '804404086622781481',
    'Class 19': '892921274739867698',
    'Class 18': '892921633164099634',
    'Class 17': '892921760775802890',
    'Class 16': '892921881747943444',
    'Class 15': '892922010257199105',
    'Class 14': '892922435073114182',
    'Class 13': '892922574995066951',
    'Class 12': '892922708747247677',
    'Class 11': '892922713612623942',
    'Class 10': '892922719916658768',
    'Class 9': '892923086079393803',
    'Class 8': '892923095051034674',
    'Class 7': '892923106467909632',
    'Class 6': '892923470139252767',
    'Class 5': '892923475906424873',
    'Class 4': '892923484097900586',
    'Class 3': '892923718676934696',
    'Class 2': '892923725429743647',
    'Class 1': '892923729787641917',
    '> 2000% Crit': '844412148561739786',
    '1600% - 2000% Crit': '804404612450615346',
    '1200% - 1600% Crit': '804404370120638516',
    '800% - 1200% Crit': '804404336193044541',
    '< 800% Crit': '804404283205222441',
    'Server Announcement Ping': '804380005974540289',
    'Server Event Ping': '804544088153391124',
    'Looking for Games Ping': '805757095232274442',
    'Say Welcome': '805757342695292958',
    'Chat Revive Ping': '807578981003689984',
    'Raffle Ping': '839694796431294485',
    '@everyone': '804222694488932362',
};

export default roleIds;

export const appealServerRoleIds = {
    Admin: '805037559671422976',
    Moderator: '805037585348296725',
    'Trial Moderator': '807533306076856320',
};

export const tier1RoleIds = [
    roleIds['$5 Patreon'],
    roleIds['Server Booster'],
    roleIds['Prestige I'],
    roleIds['Weekly Top 5'],
];

export const tier2RoleIds = [
    roleIds['$5 Patreon'],
    roleIds['Server Booster'],
    roleIds['Prestige II'],
    roleIds['Weekly Top 5'],
];

export const tier3RoleIds = [roleIds['$5 Patreon'], roleIds['Prestige V']];

export const tier4RoleIds = [roleIds['$10 Patreon'], roleIds['Prestige X']];

export const tier5RoleIds = [roleIds['$20 Patreon'], roleIds['$50 Patreon']];

export const eventManagerRoleIds = [
    roleIds['Event Manager'],
    roleIds['Trial Event Manager'],
];

export const moderatorRoleIds = [roleIds.Moderator, roleIds['Trial Moderator']];

export const prestigeRoles: { [level: number]: string } = {
    1: roleIds['Prestige I'],
    2: roleIds['Prestige II'],
    3: roleIds['Prestige III'],
    4: roleIds['Prestige IV'],
    5: roleIds['Prestige V'],
    6: roleIds['Prestige VI'],
    7: roleIds['Prestige VII'],
    8: roleIds['Prestige VIII'],
    9: roleIds['Prestige IX'],
    10: roleIds['Prestige X'],
};
