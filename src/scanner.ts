export interface OklchCandidate {
  end: number;
  raw: string;
  start: number;
}

const FUNCTION_NAME = 'oklch(';

const isIdentifierCharacter = (characterCode: number): boolean => (
  (characterCode >= 48 && characterCode <= 57)
  || (characterCode >= 65 && characterCode <= 90)
  || (characterCode >= 97 && characterCode <= 122)
  || characterCode === 45
  || characterCode === 95
);

const findClosingParenthesis = (text: string, openingIndex: number): number => {
  let depth = 0;

  for (let index = openingIndex; index < text.length; index += 1) {
    const character = text[index];
    if (character === '(') {
      depth += 1;
      continue;
    }

    if (character === ')') {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
};

export const scanOklchFunctions = (text: string, baseOffset = 0, maxMatches = Number.POSITIVE_INFINITY): OklchCandidate[] => {
  if (maxMatches <= 0 || text.length === 0) {
    return [];
  }

  const lowerCaseText = text.toLowerCase();
  const matches: OklchCandidate[] = [];
  let searchIndex = 0;

  while (searchIndex < lowerCaseText.length && matches.length < maxMatches) {
    const matchIndex = lowerCaseText.indexOf(FUNCTION_NAME, searchIndex);
    if (matchIndex === -1) {
      break;
    }

    if (matchIndex > 0 && isIdentifierCharacter(lowerCaseText.codePointAt(matchIndex - 1) ?? 0)) {
      searchIndex = matchIndex + FUNCTION_NAME.length;
      continue;
    }

    const openingIndex = matchIndex + FUNCTION_NAME.length - 1;
    const closingIndex = findClosingParenthesis(text, openingIndex);
    if (closingIndex === -1) {
      searchIndex = matchIndex + FUNCTION_NAME.length;
      continue;
    }

    matches.push({
      end: baseOffset + closingIndex + 1,
      raw: text.slice(matchIndex, closingIndex + 1),
      start: baseOffset + matchIndex,
    });

    searchIndex = closingIndex + 1;
  }

  return matches;
};
