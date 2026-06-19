import {Platform, TextStyle} from 'react-native';
import {scaleFont} from './dimensions';
import {appColors, AppColors} from './colors';

type FontWeight = 300 | 400 | 500 | 600 | 700 | 'regular' | 'medium' | 'bold';

export function typography(
  weight: FontWeight,
  size: number = 16,
  color?: AppColors,
): TextStyle {
  let fontFamily = 'Poppins-Regular';

  switch (weight) {
    case 300:
      fontFamily = 'Poppins-Thin';
      break;
    case 400:
    case 'regular':
      fontFamily = 'Poppins-Regular';
      break;
    case 500:
    case 'medium':
      fontFamily = 'Poppins-Medium';
      break;
    case 600:
      fontFamily = 'Poppins-SemiBold';
      break;
    case 700:
    case 'bold':
      fontFamily = 'Poppins-Bold';
      break;
  }

  return {
    fontSize: scaleFont(size),
    fontFamily,
    fontWeight: Platform.OS === 'ios' ? '400' : undefined,
    ...(color ? {color: appColors[color]} : {}),
    includeFontPadding: false,
  };
}
