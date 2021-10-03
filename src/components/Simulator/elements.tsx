import { styled } from 'stitches';

export const _App = styled('main', {
  position: 'relative',
  display: 'flex',
  alignItems: 'stretch',
  flexGrow: 1,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
});

export const _CanvasWrapper = styled('div', {
  position: 'relative',
  flexGrow: 1,
  overflow: 'hidden',
});

export const _Canvas = styled('canvas', {
  display: 'block',
  cursor: 'initial',

  variants: {
    enableScaling: {
      true: {
        transformOrigin: '0 0',
        transform: 'scale(var(--factor, 1))',
      },
    },
  },
});

export const _FpsCounter = styled('span', {
  position: 'absolute',
  top: 6,
  right: 6,
  userSelect: 'none',
  pointerEvents: 'none',
});

export const _Space = styled('span', {
  flexGrow: 1,
});

export const _Info = styled('div', {
  display: 'none',

  '@bp2': {
    display: 'flex',
    flexShrink: 0,
    flexDirection: 'column',
    flexBasis: 300,
    padding: '16px 20px',
    borderLeft: '1px solid #888',
    background: '#ddd',
    overflow: 'hidden',
    overflowY: 'auto',

    '> *:not(:last-child)': {
      marginBottom: 16,
    },
  },
});
