import Discord from 'discord.js';

export default async function eightBall(
    message: Discord.Message
): Promise<void> {
    const { channel } = message;
    const regex = /^(does|do|did|wanna|should|is|are|am|should|may|shall|was|were|will|can|could|would|have|had|havn't|hadn't|haven't|didn't|don't|wouldn't|isn't|aren't|ain't|shouldn't|won't|can't|weren't|couldn't)( .+){1,}\?/i;
    if (
        [
            '804229330443436032',
            '804230784205979649',
            '804224162364129320',
        ].includes(channel.id)
    )
        return;
    if (message.content.match(regex)) {
        const eightballAns = [
            'It is certain',
            'It is decidedly so',
            'Without a doubt',
            'Yes – definitely',
            'You may rely on it',
            'As I see it, yes',
            'Most likely',
            'Outlook good',
            'Yes',
            'Signs point to yes',
            'Reply hazy, try again',
            'Ask again later',
            'Better not tell you now',
            'Cannot predict now',
            'Concentrate and ask again',
            "Don't count on it",
            'My reply is no',
            'My sources say no',
            'Outlook not so good',
            'Very doubtful',
        ];
        const randomNumber = Math.floor(Math.random() * 20);
        await message.channel.send(eightballAns[randomNumber]);
    }
}
