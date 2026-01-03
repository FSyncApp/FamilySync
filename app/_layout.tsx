import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      {/*
        Default to hiding Expo Router's native stack headers to avoid intermittent
        "Main/Home" back labels or route-name headers (e.g. birthdays/index) showing up.
        Feature stacks that want headers (e.g. tasks) control them in their own *_layout.tsx.
      */}
      <Stack screenOptions={{ headerShown: false }}>
        {/* Bottom tabs (Home / Calendar / Messages / Settings) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Bannerless router-native/bridge stacks */}
        <Stack.Screen name="bills" options={{ headerShown: false }} />
        <Stack.Screen name="bills/index" options={{ headerShown: false }} />
        <Stack.Screen name="bills/form" options={{ headerShown: false }} />

        <Stack.Screen name="tasks" options={{ headerShown: false }} />
        <Stack.Screen name="tasks/index" options={{ headerShown: false }} />
        <Stack.Screen name="tasks/form" options={{ headerShown: false }} />

        <Stack.Screen name="calendar" options={{ headerShown: false }} />
        <Stack.Screen name="calendar/index" options={{ headerShown: false }} />

        <Stack.Screen name="messages" options={{ headerShown: false }} />
        <Stack.Screen name="messages/index" options={{ headerShown: false }} />

        {/* Birthdays (router-native stack) */}
        <Stack.Screen name="birthdays" options={{ headerShown: false }} />
        <Stack.Screen name="birthdays/index" options={{ headerShown: false }} />

        {/* Legacy container screen (with banner inside the component) */}
        <Stack.Screen name="legacy" options={{ headerShown: false }} />

        {/* Keep modal behavior */}
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
