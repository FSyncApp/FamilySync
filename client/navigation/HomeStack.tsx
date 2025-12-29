import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import BirthdaysScreen from "../screens/BirthdaysScreen";
import BirthdayDetailScreen from "../screens/BirthdayDetailScreen";
import BirthdaysEditScreen from "../screens/BirthdaysEditScreen";

import BillsStack from "./BillsStack";

/**
 * HomeStack hosts:
 * - Home (reference surface)
 * - Birthdays flow (Phase 1)
 * - BillsStack entry (Phase 2 scaffold) — Bills screens live in their own stack
 */
export type HomeStackParamList = {
  Home: undefined;

  // Phase 1: Birthdays flow
  Birthdays: undefined;
  BirthdaysEdit:
    | undefined
    | {
        existing?: {
          name: string;
          relationship?: string;
          dateYYYYMMDD: string;
        };
      };
  BirthdayDetail: { id: string };

  // Phase 2: Bills flow (separate stack)
  Bills: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />

      {/* Bills lives in its own stack — hide header here so BillsStack owns titles/back */}
      <Stack.Screen name="Bills" component={BillsStack} options={{ headerShown: false }} />

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
