import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import BirthdaysScreen from "../screens/BirthdaysScreen";
import BirthdaysEditScreen from "../screens/BirthdaysEditScreen";

export type HomeStackParamList = {
  Home: undefined;
  Birthdays: undefined;
  BirthdaysEdit:
    | undefined
    | {
        existing?: { name: string; relationship?: string; dateYYYYMMDD: string };
      };
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
    </Stack.Navigator>
  );
}
