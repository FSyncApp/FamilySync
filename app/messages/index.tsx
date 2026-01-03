import React from "react";
import { NavigationContainer, type InitialState } from "@react-navigation/native";
import { NavigationIndependentTree } from "@react-navigation/native";
import { Stack } from "expo-router";

import MainTabs from "../../migration_src/client/navigation/MainTabs";

/**
 * /messages (Router route)
 * Bannerless legacy Messages with bottom tabs.
 */
function buildInitialState(): InitialState {
  return {
    stale: false,
    type: "tab",
    key: "legacy-tabs",
    index: 2, // Messages tab (Home=0, Calendar=1, Messages=2, Settings=3)
    routeNames: ["Home", "Calendar", "Messages", "Settings"],
    routes: [
      { key: "legacy-home", name: "Home" },
      { key: "legacy-calendar", name: "Calendar" },
      { key: "legacy-messages", name: "Messages" },
      { key: "legacy-settings", name: "Settings" },
    ],
  } as any;
}

export default function MessagesRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <NavigationIndependentTree>
        <NavigationContainer initialState={buildInitialState()}>
          <MainTabs />
        </NavigationContainer>
      </NavigationIndependentTree>
    </>
  );
}
