import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import CalendarScreen from "../screens/CalendarScreen";
import MessagesScreen from "../screens/MessagesScreen";
import SettingsStack from "./SettingsStack";

export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Messages: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarIcon: ({ focused, color, size }) => {
          const name =
            route.name === "Home"
              ? focused
                ? "home"
                : "home-outline"
              : route.name === "Calendar"
                ? focused
                  ? "calendar"
                  : "calendar-outline"
                : route.name === "Messages"
                  ? focused
                    ? "chatbubbles"
                    : "chatbubbles-outline"
                  : focused
                    ? "settings"
                    : "settings-outline";
          return <Ionicons name={name as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}
