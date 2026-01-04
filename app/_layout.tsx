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
      <Stack>
        {/* Bottom tabs (Home / Calendar / Messages / Settings) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Bannerless legacy bridges */}
        <Stack.Screen name="bills" options={{ headerShown: false }} />
        <Stack.Screen name="bills/form" options={{ headerShown: false }} />
        <Stack.Screen name="calendar" options={{ headerShown: false }} />
        <Stack.Screen name="tasks" options={{ headerShown: false }} />
        <Stack.Screen name="messages" options={{ headerShown: false }} />

        {/* Legacy container screen (with banner) */}
        <Stack.Screen name="legacy" options={{ headerShown: false }} />

        {/* Keep modal behavior */}
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
