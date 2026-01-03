import React from "react";
import { Platform, Switch, type SwitchProps } from "react-native";

/**
 * AppleSwitch
 * Ensures iOS-native looking toggle styling everywhere.
 *
 * - iOS: still uses the native Switch, but we apply iOS default colors
 *        when the caller doesn't provide them (so "on" is green).
 * - Android/others: apply iOS-like colors for closer parity.
 */
const DEFAULT_TRACK = { false: "#E5E5EA", true: "#34C759" };
const DEFAULT_THUMB = "#FFFFFF";
const DEFAULT_IOS_BG = "#E5E5EA";

export default function AppleSwitch(props: SwitchProps) {
  const { trackColor, thumbColor, ios_backgroundColor, ...rest } = props;

  const resolvedTrack = trackColor ?? DEFAULT_TRACK;
  const resolvedThumb = thumbColor ?? DEFAULT_THUMB;
  const resolvedIosBg = ios_backgroundColor ?? DEFAULT_IOS_BG;

  // Even on iOS, passing trackColor ensures "on" appears green consistently.
  return (
    <Switch
      trackColor={resolvedTrack}
      thumbColor={resolvedThumb}
      ios_backgroundColor={resolvedIosBg}
      {...rest}
    />
  );
}
