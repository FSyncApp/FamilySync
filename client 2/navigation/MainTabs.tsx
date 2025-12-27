import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import CalendarScreen from "../screens/CalendarScreen";
import MessagesScreen from "../screens/MessagesScreen";
import SettingsScreen from "../screens/SettingsScreen";

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Messages: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const colors = {
  card: "#FFFFFF",
  border: "#E6E8EE",
  inkMuted: "#6B7280",
  tint: "#111827",
};

function tabIcon(routeName: keyof MainTabParamList) {
  switch (routeName) {
    case "Home":
      return "home-outline";
    case "Calendar":
      return "calendar-outline";
    case "Messages":
      return "chatbubble-ellipses-outline";
    case "Settings":
      return "settings-outline";
    default:
      return "ellipse-outline";
  }
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, size }) => {
          const name = tabIcon(route.name as keyof MainTabParamList);
          return (
            <Ionicons
              name={name as any}
              size={size ?? 22}
              color={focused ? colors.tint : colors.inkMuted}
            />
          );
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 0 : 2,
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 86 : 66,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 22 : 10,
        },
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
