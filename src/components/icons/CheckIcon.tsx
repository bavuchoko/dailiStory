import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export const CheckIcon: React.FC<Props> = ({
  size = 24,
  color = '#111827',
  strokeWidth = 2.5,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M0 0h24v24H0z" fill="none" />
      <Path
        d="M5 12l5 5l9 -10"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
};
