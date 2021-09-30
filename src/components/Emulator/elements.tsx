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

export const _Panel = styled('div', {
  position: 'absolute',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  top: 0,
  left: 0,
  padding: 4,
  borderRadius: 2,
});

export const _CanvasWrapper = styled('div', {
  flexGrow: 1,
  overflow: 'hidden',
});

export const _Canvas = styled('canvas', {
  display: 'block',
  cursor: 'grab',

  variants: {
    enableScaling: {
      true: {
        transformOrigin: '0 0',
        transform: 'scale(var(--factor, 1))',
      },
    },
  },
});

export const _Button = styled('button', {
  width: 48,
  height: 48,
  flexShrink: 0,
  border: 'none',
  color: '#333',
  background: '#dadada',
  fontVariant: '14|20',
  whiteSpace: 'nowrap',
  appearance: 'none',

  '&:disabled': {
    color: '#999',
  },

  '&:not(:disabled)': {
    cursor: 'pointer',
  },
});

export const _Divider = styled('span', {
  height: 8,
});

export const _Space = styled('span', {
  flexGrow: 1,
});

export const _Yes = styled('span', {
  color: '#4ebd4e',
});

export const _No = styled('span', {
  color: '#666',
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
    overflowYy: 'auto',

    '> *:not(:last-child)': {
      marginBottom: 16,
    },
  },
});

export const _SimulateButton = styled('button', {
  border: '1px solid #999',
  borderRadius: 0,
  appearance: 'none',
  cursor: 'pointer',

  variants: {
    active: {
      true: {
        color: '#fff',
        background: 'lightgreen',
      },
    },
  },
});
