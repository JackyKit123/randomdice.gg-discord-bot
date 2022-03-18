import { mapChoices } from 'register/commandData';
import * as stringSimilarity from 'string-similarity';

export default function getSuggestions(
    choices: { name: string }[],
    input: string
): ReturnType<typeof mapChoices> {
    const lowerCased = input.toLowerCase();
    return mapChoices(
        choices
            .filter(
                ({ name }) =>
                    stringSimilarity.compareTwoStrings(
                        name.toLowerCase(),
                        input
                    ) > Math.min(0.1 + input.length / 10, 0.7) ||
                    name.toLowerCase().includes(lowerCased)
            )
            .sort(
                ({ name: a }, { name: b }) =>
                    stringSimilarity.compareTwoStrings(a, lowerCased) -
                    stringSimilarity.compareTwoStrings(b, lowerCased)
            )
    );
}
