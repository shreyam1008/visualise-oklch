import type { DecorationRenderOptions } from 'vscode';

import type { ResolvedSwatch } from './color';

const SWATCH_MARGIN = '0 0.42em 0 0.12em';
const SWATCH_SIZE = '0.82em';

export const buildDecorationRenderOptions = (swatch: ResolvedSwatch): DecorationRenderOptions => ({
  before: {
    backgroundColor: swatch.hex,
    border: `1px solid ${swatch.darkBorderColor}`,
    contentText: ' ',
    height: SWATCH_SIZE,
    margin: SWATCH_MARGIN,
    width: SWATCH_SIZE,
  },
  dark: {
    before: {
      border: `1px solid ${swatch.darkBorderColor}`,
    },
  },
  light: {
    before: {
      border: `1px solid ${swatch.lightBorderColor}`,
    },
  },
});
