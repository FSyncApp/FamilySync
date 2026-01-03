import React from "react";
import { NavigationContainer, type InitialState } from "@react-navigation/native";
import { NavigationIndependentTree } from "@react-navigation/native";

import HomeStack from "../../migration_src/client/navigation/HomeStack";

/**
 * /tasks (Router route)
 * Bannerless legacy Tasks, mounted via HomeStack.
 */
function buildInitialState(): InitialState {
  return {
    stale: false,
    type: "stack",
    key: "root",
    index: 0,
    routeNames: ["Home"],
    routes: [
      {
        name: "Home",
        state: {
          stale: false,
          type: "stack",
          key: "home-stack",
          index: 0,
          routeNames: ["Tasks"],
          routes: [{ name: "Tasks" }],
        },
      },
    ],
  } as any;
}

export default function TasksRoute() {
  return (
    <NavigationIndependentTree>
      <NavigationContainer initialState={buildInitialState()}>
        <HomeStack />
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
