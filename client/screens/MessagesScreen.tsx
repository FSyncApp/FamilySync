import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { MessagesStackParamList } from "../navigation/MessagesStack";
import { DEMO_CONVERSATIONS } from "../data/messagesDemo";

type Nav = NativeStackNavigationProp<MessagesStackParamList, "ChatsList">;

// Phase 1: demo-only list. Flip to false to see empty state.
const USE_DEMO_DATA = true;

export default function MessagesScreen() {
  const navigation = useNavigation<Nav>();

  const conversations = useMemo(() => {
    if (!USE_DEMO_DATA) return [];
    return DEMO_CONVERSATIONS;
  }, []);

  if (conversations.length === 0) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyWrap}>
          <View style={styles.illustration} />
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptyBody}>
            Family conversations will appear here.{"\n"}
            This is where you’ll chat, plan, and coordinate together.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("MessageThread", { conversationId: item.id })
            }
            style={({ pressed }) => [
              styles.row,
              pressed ? styles.rowPressed : null,
            ]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.title
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()}
              </Text>
            </View>

            <View style={styles.rowCenter}>
              <View style={styles.rowTopLine}>
                <View style={styles.titleWrap}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.isPinned ? (
                    <View style={styles.pinnedPill}>
                      <Text style={styles.pinnedText}>Pinned</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.time} numberOfLines={1}>
                  {item.lastMessageAtLabel}
                </Text>
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessagePreview}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  listContent: {
    paddingVertical: 6,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E6E6EA",
    marginLeft: 78,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowPressed: {
    backgroundColor: "#F6F7FA",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F2F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4A4A4A",
  },

  rowCenter: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
  },
  rowTopLine: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  pinnedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#F0F2F7",
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B6B6B",
  },
  time: {
    fontSize: 12,
    color: "#6B6B6B",
  },
  preview: {
    marginTop: 3,
    fontSize: 14,
    color: "#6B6B6B",
  },

  emptyWrap: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  illustration: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#F0F2F7",
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 15,
    lineHeight: 20,
    color: "#6B6B6B",
    textAlign: "center",
  },
});
