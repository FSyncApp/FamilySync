import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import TasksListScreen from "../screens/tasks/TasksListScreen";
import TaskFormScreen from "../screens/tasks/TaskFormScreen";

export type TasksStackParamList = {
  TasksList: undefined;
  TaskForm: { mode: "create" | "edit"; taskId?: string } | undefined;
};

const Stack = createNativeStackNavigator<TasksStackParamList>();

export default function TasksStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TasksList" component={TasksListScreen} options={{ title: "Tasks" }} />
      <Stack.Screen name="TaskForm" component={TaskFormScreen} options={{ title: "Add task" }} />
    </Stack.Navigator>
  );
}
