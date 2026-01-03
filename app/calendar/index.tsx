import React from "react";
import { NavigationContainer, type InitialState } from "@react-navigation/native";
import { NavigationIndependentTree } from "@react-navigation/native";

import MainTabs from "../../migration_src/client/navigation/MainTabs";

/**
 * /calendar (Router route)
 * Bannerless legacy Calendar with bottom tabs.
 */
function buildInitialState(): InitialState {
  return {
    stale: false,
    type: "tab",
    key: "legacy-tabs",
    index: 1, // Calendar tab index (Home=0, Calendar=1)
    routeNames: ["Home", "Calendar", "Messages", "Settings"],
    routes: [
      { key: "legacy-home", name: "Home" },
      { key: "legacy-calendar", name: "Calendar" },
      { key: "legacy-messages", name: "Messages" },
      { key: "legacy-settings", name: "Settings" },
    ],
  } as any;
}

export default function CalendarRoute() {
  return (
    <NavigationIndependentTree>
      <NavigationContainer initialState={buildInitialState()}>
        <MainTabs />
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
