import React from 'react';
import {Image, ImageStyle, StyleProp, ViewStyle} from 'react-native';
import {useAppSelector} from '../store';
import {
  userProfileSelector,
  profileImageUrlSelector,
  profileImageKeySelector,
} from '../slices';
import {Avatar} from './Avatar';

const icProfile = require('../assets/images/ic-profile.png');

interface Props {
  size: number;
  // Shown when the user has no profile photo (preserves each screen's look).
  fallbackIconStyle?: StyleProp<ImageStyle>;
  style?: ViewStyle;
}

/**
 * The signed-in user's avatar, driven by the profile photo stored on the user
 * slice (fetched on login by MessagingManager, refreshed after upload). Falls
 * back to the default person icon when no photo has been set yet.
 */
export const CurrentUserAvatar = ({size, fallbackIconStyle, style}: Props) => {
  const profile = useAppSelector(userProfileSelector);
  const imageUrl = useAppSelector(profileImageUrlSelector);
  const imageKey = useAppSelector(profileImageKeySelector);

  if (!imageUrl) {
    return <Image source={icProfile} style={fallbackIconStyle} />;
  }

  return (
    <Avatar
      name={profile?.name || profile?.email || 'U'}
      id={profile?.sub}
      size={size}
      imageUrl={imageUrl}
      cacheKey={imageKey}
      style={style}
    />
  );
};
