import React from "react";
import { Stack as RouterStack } from "expo-router";
import { NavigationIndependentTree } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BirthdaysScreen from "@/migration_src/client/screens/BirthdaysScreen";
import BirthdaysEditScreen from "@/migration_src/client/screens/BirthdaysEditScreen";
import BirthdayDetailScreen from "@/migration_src/client/screens/BirthdayDetailScreen";

type BirthdaysStackParamList = {
  Birthdays: undefined;
  BirthdaysEdit: { existing?: any } | undefined;
  BirthdayDetail: { id: string };
};

const Stack = createNativeStackNavigator<BirthdaysStackParamList>();

export default function BirthdaysRoute() {
  return (
    <>
      {/* Ensure router header stays off */}
      <RouterStack.Screen options={{ headerShown: false }} />

      {/* Legacy stack hosted safely under Router */}
      <NavigationIndependentTree>
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
      </NavigationIndependentTree>
    </>
  );
}
