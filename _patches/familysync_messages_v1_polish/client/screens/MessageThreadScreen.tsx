import React, { useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import type { MessagesStackParamList } from "../navigation/MessagesStack";
import {
  getConversationById,
  getMessagesForConversation,
} from "../data/messagesDemo";

type R = RouteProp<MessagesStackParamList, "MessageThread">;

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export default function MessageThreadScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation();

  const conversationId = route.params.conversationId;

  const conversation = useMemo(
    () => getConversationById(conversationId),
    [conversationId]
  );

  const messages = useMemo(
    () => getMessagesForConversation(conversationId),
    [conversationId]
  );

  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    navigation.setOptions({
      title: conversation?.title ?? "Conversation",
    });
  }, [conversation?.title, navigation]);

  useEffect(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, [conversationId]);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isYou = item.sender === "You";
            const isSystem = item.sender === "FamilySync";

            return (
              <View
                style={[
                  styles.bubbleRow,
                  isYou ? styles.rowRight : styles.rowLeft,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isYou ? styles.bubbleYou : styles.bubbleOther,
                    isSystem ? styles.bubbleSystem : null,
                  ]}
                >
                  <Text style={styles.sender}>{item.sender}</Text>
                  <Text style={styles.text}>{item.text}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.time}>{formatTime(item.createdAtISO)}</Text>
                  </View>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Messaging coming soon"
              editable={false}
              pointerEvents="none"
            />
            <Pressable style={styles.sendBtn} disabled>
              <Text style={styles.sendText}>Send</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  screen: {
    flex: 1,
    backgroundColor: "#F6F7FA",
  },

  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },

  bubbleRow: {
    flexDirection: "row",
  },
  rowLeft: {
    justifyContent: "flex-start",
  },
  rowRight: {
    justifyContent: "flex-end",
  },

  bubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  bubbleOther: {
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E6E6EA",
  },
  bubbleYou: {
    backgroundColor: "#E9F1FF",
  },
  bubbleSystem: {
    backgroundColor: "#F6F2E8",
  },

  sender: {
    fontSize: 12,
    color: "#6B6B6B",
    marginBottom: 4,
    fontWeight: "600",
  },
  text: {
    fontSize: 15,
    color: "#111111",
    lineHeight: 20,
  },
  metaRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  time: {
    fontSize: 11,
    color: "#7A7A7A",
  },

  inputBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E6E6EA",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 14,
    backgroundColor: "#F0F2F7",
    color: "#6B6B6B",
  },
  sendBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#D9D9DE",
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#8A8A8A",
  },
});
