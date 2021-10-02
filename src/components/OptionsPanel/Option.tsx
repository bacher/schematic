import { styled } from 'stitches';

const _Option = styled('label', {
  userSelect: 'none',

  '> input:not(:disabled)': {
    cursor: 'pointer',
  },
});

type Props = {
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function Option({ title, checked, onChange }: Props) {
  return (
    <_Option>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
      />{' '}
      {title}
    </_Option>
  );
}
