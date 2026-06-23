export type AppColors =
  | 'primaryGreen'
  | 'navyBlue'
  | 'white'
  | 'black'
  | 'background'
  | 'gray'
  | 'lightGray'
  | 'error'
  | 'coffeeDark'
  | 'coffeeLight'
  | 'maroon'
  | 'maroonLink'
  | 'inputBorder'
  | 'success'
  | 'warning'
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
  coffeeDark: 'rgba(61, 32, 20, 1)', // #3D2014
  coffeeLight: 'rgba(85, 69, 54, 1)', // #554536
  maroon: 'rgba(94, 23, 23, 1)', // #5E1717 — primary button / brand
  maroonLink: 'rgba(142, 35, 35, 1)', // #8E2323 — links / accents
  inputBorder: 'rgba(225, 217, 203, 1)', // #E1D9CB — field borders
  success: 'rgba(30, 135, 75, 1)', // #1E874B — success status
  warning: 'rgba(169, 130, 28, 1)', // #A9821C — pending status
  transparent: 'transparent',
};
