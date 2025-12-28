import React from "react";
import { View, StyleSheet } from "react-native";

import SettingsStack from "../navigation/SettingsStack";

/**
 * Legacy SettingsScreen (Phase 1)
 *
 * Some legacy paths still route to `client/screens/SettingsScreen.tsx`.
 * Redirecting via navigate() has proven unreliable in the current navigator contexts,
 * and can trap the app on a spinner.
 *
 * Phase 1 fix (rollback-safe, zero ambiguity):
 *  - Render the real SettingsStack directly.
 *  - This guarantees Settings routes (Privacy, Appearance, etc.) exist and taps work.
 *
 * NOTE:
 *  - This file should be removed once legacy paths are fully eliminated.
 */

export default function SettingsScreen() {
  return (
    <View style={styles.wrap}>
      <SettingsStack />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
