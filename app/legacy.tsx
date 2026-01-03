import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { NavigationContainer, NavigationIndependentTree } from "@react-navigation/native";

import MainTabs from "../migration_src/client/navigation/MainTabs";

export default function LegacyScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Migration Mode</Text>
        <Text style={styles.bannerSubtitle}>
          Rendering legacy FamilySync navigation inside Expo Router ({Platform.OS})
        </Text>
      </View>

      <View style={styles.legacy}>
        <NavigationIndependentTree>
          <NavigationContainer>
            <MainTabs />
          </NavigationContainer>
        </NavigationIndependentTree>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  banner: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bannerTitle: { fontSize: 16, fontWeight: "700" },
  bannerSubtitle: { marginTop: 4, opacity: 0.7 },
  legacy: { flex: 1 },
});
