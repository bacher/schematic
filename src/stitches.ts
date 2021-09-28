import { createStitches } from '@stitches/react';

export const {
  styled,
  css,
  globalCss,
  keyframes,
  getCssText,
  theme,
  createTheme,
  config,
} = createStitches({
  theme: {
    colors: {
      gray400: 'gainsboro',
      gray500: 'lightgray',
    },
  },
  media: {
    bp1: '(min-width: 480px)',
    bp2: '(min-width: 768px)',
  },
  utils: {
    fontVariant: (value: `${number}|${number}`) => {
      const [size, lineHeight] = value.split('|');

      return {
        fontSize: `${size}px`,
        lineHeight: `${lineHeight}px`,
      };
    },
  },
});
