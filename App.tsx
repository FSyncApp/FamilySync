import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

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
  Main:
    | undefined
    | {
        /**
         * If provided, MainTabs will route to this tab on first render.
         * (MainTabs already supports route.params.initialTab)
         */
        initialTab?: "Home" | "Calendar" | "Messages" | "Settings";
      };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function isDevSkipOnboardingEnabled() {
  // Dev-only onboarding bypass (Option A).
  //
  // Canon: MUST be removed/disabled before production/TestFlight release.
  // TODO(REMOVE BEFORE RELEASE): delete this bypass and restore normal onboarding gating.
  if (!__DEV__) return false;

  const raw = process.env.EXPO_PUBLIC_DEV_SKIP_ONBOARDING;
  if (!raw) return false;

  const v = String(raw).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export default function App() {
  const devSkipOnboarding = isDevSkipOnboardingEnabled();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={devSkipOnboarding ? "Main" : "Welcome"}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />

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
            initialParams={devSkipOnboarding ? { initialTab: "Home" } : undefined}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
