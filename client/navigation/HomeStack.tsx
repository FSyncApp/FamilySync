import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import BirthdaysScreen from "../screens/BirthdaysScreen";
import BirthdayDetailScreen from "../screens/BirthdayDetailScreen";
import BirthdaysEditScreen from "../screens/BirthdaysEditScreen";

/**
 * HomeStack hosts:
 * - Home (reference surface)
 * - Birthdays flow (Phase 1)
 *
 * NOTE: Bills will live in its own BillsStack (Phase 2), not here.
 */
export type HomeStackParamList = {
  Home: undefined;
  Birthdays: undefined;
  BirthdaysEdit:
    | undefined
    | {
        existing?: {
          name: string;
          relationship?: string;
          dateYYYYMMDD: string;
          // If additional fields exist, screens can safely ignore them.
          // Keep this minimal to avoid tight coupling.
        };
      };
  BirthdayDetail: { id: string };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />

      <Stack.Screen
        name="Birthdays"
        component={BirthdaysScreen}
        options={{ title: "Birthdays", headerBackTitleVisible: false }}
      />

      <Stack.Screen
        name="BirthdaysEdit"
        component={BirthdaysEditScreen}
        options={{ title: "Edit birthday", headerBackTitleVisible: false }}
      />

      <Stack.Screen name="BirthdayDetail" component={BirthdayDetailScreen} options={{ title: "Birthday" }} />
    </Stack.Navigator>
  );
}
