import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WelcomeScreen from "./client/screens/WelcomeScreen";
import CreateAccountScreen from "./client/screens/CreateAccountScreen";
import YourDetailsScreen from "./client/screens/YourDetailsScreen";
import FamilyNameScreen from "./client/screens/FamilyNameScreen";
import AddChildrenScreen from "./client/screens/AddChildrenScreen";
import InviteAdultsScreen from "./client/screens/InviteAdultsScreen";

import MainTabs from "./client/navigation/MainTabs";

export type RootStackParamList = {
  Welcome: undefined;
  CreateAccount: undefined;
  YourDetails: undefined;
  FamilyName: undefined;
  AddChildren: undefined;
  InviteAdults: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Welcome">
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="CreateAccount"
          component={CreateAccountScreen}
          options={{ title: "", headerBackTitleVisible: false }}
        />

        <Stack.Screen
          name="YourDetails"
          component={YourDetailsScreen}
          options={{ title: "", headerBackTitleVisible: false }}
        />

        <Stack.Screen
          name="FamilyName"
          component={FamilyNameScreen}
          options={{ title: "", headerBackTitleVisible: false }}
        />

        <Stack.Screen
          name="AddChildren"
          component={AddChildrenScreen}
          options={{ title: "", headerBackTitleVisible: false }}
        />

        <Stack.Screen
          name="InviteAdults"
          component={InviteAdultsScreen}
          options={{ title: "", headerBackTitleVisible: false }}
        />

        {/* Post-onboarding: bottom tab shell */}
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
