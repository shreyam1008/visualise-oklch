export interface NumericRange {
  end: number;
  start: number;
}

export function expandRanges(ranges: NumericRange[], padding: number, upperBound: number): NumericRange[] {
  return ranges.map((range) => ({
    end: Math.min(upperBound, range.end + padding),
    start: Math.max(0, range.start - padding)
  }));
}

export function mergeRanges(ranges: NumericRange[]): NumericRange[] {
  if (ranges.length <= 1) {
    return [...ranges];
  }

  const sorted = [...ranges].toSorted((left, right) => left.start - right.start || left.end - right.end);
  const merged: NumericRange[] = [sorted[0]!];

  for (const current of sorted.slice(1)) {
    const previous = merged.at(-1)!;
    if (current.start <= previous.end + 1) {
      previous.end = Math.max(previous.end, current.end);
      continue;
    }
    merged.push({
      end: current.end,
      start: current.start
    });
  }

  return merged;
}
