import { styled } from 'stitches';

import { ElementType } from 'common/types';
import { GameModel, useGameState } from 'models/GameModel';

export const _Wrapper = styled('div', {
  position: 'absolute',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  top: 0,
  left: 0,
  padding: 4,
  borderRadius: 2,
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

type Props = {
  gameModel: GameModel;
};

export function Toolbar({ gameModel }: Props) {
  const { focusElement, autoSaves } = useGameState(
    gameModel,
    ({ focusElement, options }) => ({
      focusElement,
      autoSaves: options.autoSaves,
    }),
  );

  return (
    <_Wrapper>
      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
      <a href="#" title="">
        <_Button type="button">Menu</_Button>
      </a>
      <_Divider />
      <_Button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          gameModel.addElement(ElementType.POWER);
        }}
      >
        DD
      </_Button>
      <_Button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          gameModel.addElement(ElementType.GROUND);
        }}
      >
        GND
      </_Button>
      <_Button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          gameModel.addElement(ElementType.NPN);
        }}
      >
        npn
      </_Button>
      <_Button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          gameModel.addElement(ElementType.PNP);
        }}
      >
        pnp
      </_Button>
      <_Button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          gameModel.addElement(ElementType.INPUT);
        }}
      >
        input
      </_Button>
      <_Button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          gameModel.addElement(ElementType.OUTPUT);
        }}
      >
        output
      </_Button>
      <_Button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          gameModel.addElement(ElementType.DOT);
        }}
      >
        dot
      </_Button>
      <_Divider />
      <_Button
        type="button"
        disabled={!focusElement}
        onClick={(e) => {
          e.preventDefault();
          gameModel.deleteElementInFocus();
        }}
      >
        delete
      </_Button>
      <_Divider />
      {!autoSaves && (
        <>
          <_Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              gameModel.reloadFromSave();
            }}
          >
            Reload
          </_Button>
          <_Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              gameModel.saveGame();
            }}
          >
            Save
          </_Button>
        </>
      )}
      <_Button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          gameModel.clearState();
        }}
      >
        Clear
      </_Button>
    </_Wrapper>
  );
}
