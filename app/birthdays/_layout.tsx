import { Stack } from "expo-router";

/**
 * Birthdays router-native stack layout.
 *
 * We hide the Expo Router header so the legacy screens render their own UI
 * and we don't show a top-left "Main/Home" back label.
 */
export default function BirthdaysLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
