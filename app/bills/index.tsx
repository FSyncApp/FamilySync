import React from "react";
import { NavigationContainer, type InitialState } from "@react-navigation/native";
import { NavigationIndependentTree } from "@react-navigation/native";

import MainTabs from "../../migration_src/client/navigation/MainTabs";

/**
 * /bills (Router route) — legacy shell with bottom tabs.
 * Opens directly on the legacy Bills tab, so the bottom bar matches the legacy app.
 */
function buildInitialState(): InitialState {
  return {
    stale: false,
    type: "tab",
    key: "legacy-tabs",
    index: 1, // Bills tab index (Home=0, Bills=1, Tasks=2, Birthdays=3 in our legacy state builder)
    routeNames: ["Home", "Bills", "Tasks", "Birthdays"],
    routes: [
      { key: "legacy-home", name: "Home" },
      { key: "legacy-bills", name: "Bills" },
      { key: "legacy-tasks", name: "Tasks" },
      { key: "legacy-bdays", name: "Birthdays" },
    ],
  } as any;
}

export default function BillsRoute() {
  return (
    <NavigationIndependentTree>
      <NavigationContainer initialState={buildInitialState()}>
        <MainTabs />
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
