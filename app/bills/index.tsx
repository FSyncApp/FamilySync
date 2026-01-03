import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { NavigationIndependentTree } from "@react-navigation/native";

import BillsStack from "../../migration_src/client/navigation/BillsStack";

/**
 * /bills (Router route) — temporary migration boundary
 * Goal: show the legacy Bills UI exactly (no Router-native re-skin).
 */
export default function BillsRoute() {
  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <BillsStack />
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
