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

        {/* Bannerless router-native/bridge stacks (hide default route headers) */}
        <Stack.Screen name="bills/index" options={{ headerShown: false }} />
        <Stack.Screen name="bills/form" options={{ headerShown: false }} />

        <Stack.Screen name="tasks/index" options={{ headerShown: false }} />
        <Stack.Screen name="tasks/form" options={{ headerShown: false }} />

        <Stack.Screen name="calendar/index" options={{ headerShown: false }} />
        <Stack.Screen name="messages/index" options={{ headerShown: false }} />

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
