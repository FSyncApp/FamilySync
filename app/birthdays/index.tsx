import React from "react";
import { Stack as RouterStack } from "expo-router";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BirthdaysScreen from "../../migration_src/client/screens/BirthdaysScreen";
import BirthdaysEditScreen from "../../migration_src/client/screens/BirthdaysEditScreen";
import BirthdayDetailScreen from "../../migration_src/client/screens/BirthdayDetailScreen";

/**
 * Router-native /birthdays entry point.
 *
 * We explicitly hide the Expo Router header for this page (prevents the top-left
 * back label like "Main/Home") and mount a small local Native Stack (NO NavigationContainer)
 * so legacy Birthday screens can keep using react-navigation's `navigation.navigate(...)`
 * within this isolated stack, while Expo Router owns the app shell.
 *
 * Screen names match the legacy HomeStack flow:
 * - Birthdays
 * - BirthdaysEdit
 * - BirthdayDetail
 */
const Stack = createNativeStackNavigator<any>();

export default function BirthdaysRoute() {
  return (
    <>
      {/* Force-hide Router header for this route */}
      <RouterStack.Screen options={{ headerShown: false }} />

      <Stack.Navigator
        initialRouteName="Birthdays"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Birthdays" component={BirthdaysScreen} />
        <Stack.Screen name="BirthdaysEdit" component={BirthdaysEditScreen} />
        <Stack.Screen name="BirthdayDetail" component={BirthdayDetailScreen} />
      </Stack.Navigator>
    </>
  );
}
