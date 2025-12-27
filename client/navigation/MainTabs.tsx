import React, { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import CalendarScreen from "../screens/CalendarScreen";
import SettingsScreen from "../screens/SettingsScreen";
import MessagesStack from "./MessagesStack";

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

/**
 * Phase 1: deterministic landing tab support.
 *
 * Stack -> Main can pass:
 *  - route.params.initialTab: "Home" | "Calendar" | "Messages" | "Settings"
 *  - route.params.screen (legacy): same values
 *
 * We remount the tab navigator when that param is present so iOS state restore
 * can't keep you on the last-selected tab (e.g. Messages).
 */
export default function MainTabs(props: any) {
  const routeParams = props?.route?.params ?? {};

  const initialTab: keyof MainTabParamList = useMemo(() => {
    return (routeParams.initialTab ?? routeParams.screen ?? "Home") as keyof MainTabParamList;
  }, [routeParams.initialTab, routeParams.screen]);

  // Changing the key forces a remount, which guarantees initialRouteName is honored.
  const navigatorKey = `tabs-${initialTab}`;

  useEffect(() => {
    // Clear params after first mount so normal navigation doesn't keep forcing remounts.
    if (routeParams.initialTab || routeParams.screen) {
      props?.navigation?.setParams?.({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tab.Navigator
      key={navigatorKey}
      initialRouteName={initialTab}
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
      <Tab.Screen name="Messages" component={MessagesStack} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

