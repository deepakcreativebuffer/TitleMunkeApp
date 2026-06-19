export type AppColors =
  | 'primaryGreen'
  | 'navyBlue'
  | 'white'
  | 'black'
  | 'background'
  | 'gray'
  | 'lightGray'
  | 'error'
  | 'transparent';

export const appColors: Record<AppColors, string> = {
  primaryGreen: 'rgba(142, 217, 115, 1)',
  navyBlue: 'rgba(4, 36, 51, 1)',
  white: 'rgba(255, 255, 255, 1)',
  black: 'rgba(0, 0, 0, 1)',
  background: 'rgba(255, 251, 236, 1)',
  gray: 'rgba(128, 128, 128, 1)',
  lightGray: 'rgba(200, 200, 200, 1)',
  error: 'rgba(220, 53, 69, 1)',
  transparent: 'transparent',
};
