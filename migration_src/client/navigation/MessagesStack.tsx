import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MessagesScreen from "../screens/MessagesScreen";
import MessageThreadScreen from "../screens/MessageThreadScreen";
import NewMessageScreen from "../screens/NewMessageScreen";

export type MessagesStackParamList = {
  ChatsList: undefined;
  MessageThread: { conversationId: string };
  NewMessage: undefined;
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export default function MessagesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerLargeTitle: true,
        headerBackTitle: "Chats",
      }}
    >
      <Stack.Screen
        name="ChatsList"
        component={MessagesScreen}
        options={({ navigation }) => ({
          title: "Chats",
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New message"
              onPress={() => navigation.navigate("NewMessage")}
              hitSlop={10}
              style={{ paddingLeft: 10 }}
            >
              <Ionicons name="create-outline" size={22} color={"#111827"} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="MessageThread"
        component={MessageThreadScreen}
        options={{ title: "Conversation" }}
      />
      <Stack.Screen
        name="NewMessage"
        component={NewMessageScreen}
        options={{
          title: "New Message",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
