import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import TaskFormScreen from "../../migration_src/client/screens/tasks/TaskFormScreen";

export default function TaskFormRoute() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <TaskFormScreen />
    </SafeAreaView>
  );
}
