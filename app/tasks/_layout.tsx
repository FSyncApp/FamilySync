import { Stack } from "expo-router";

export default function TasksLayout() {
  return (
    <Stack>
      {/* Show header so legacy screens can set header buttons via navigation.setOptions */}
      <Stack.Screen name="index" options={{ title: "Tasks", headerShown: true }} />
      <Stack.Screen name="form" options={{ title: "Task", headerShown: true }} />
      <Stack.Screen name="TaskForm" options={{ title: "Task", headerShown: true }} />
    </Stack>
  );
}
