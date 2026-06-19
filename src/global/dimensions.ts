import {Dimensions} from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('screen').width;
export const SCREEN_HEIGHT = Dimensions.get('screen').height;

const BASE_WIDTH = 390;

// Use for sizing elements, margins, paddings, and border radius
export const scaleWidth = (size: number) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

// Use for scaling text sizes gracefully
export const scaleFont = (size: number, factor = 0.3) => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  return Math.round(size + (scale - 1) * size * factor);
};
