import React, { useMemo } from "react";
import { SafeAreaView, View, Text, StyleSheet, ScrollView, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import type { MainTabParamList } from "../navigation/MainTabs";

type FeatureStatus = "LIVE" | "COMING_SOON";

type FeatureRow = {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: FeatureStatus;
  onPress?: () => void;
};

const vars = {
  bg: "#F5F6F8",
  card: "rgba(255,255,255,0.92)",
  border: "rgba(230,232,238,0.75)",
  ink: "#111827",
  inkMuted: "#6B7280",
  pillBg: "#111827",
  pillText: "#FFFFFF",
  soonBg: "#EEF2F7",
  soonText: "#6B7280",
};

export default function AllFeaturesScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<any>>();

  const switchTab = (tab: keyof MainTabParamList) => {
    const parent = (navigation as any).getParent?.();
    if (parent && typeof parent.navigate === "function") {
      parent.navigate(tab);
      return;
    }
    (navigation as any).navigate(tab);
  };

  const rows: FeatureRow[] = useMemo(() => {
    return [
      {
        id: "home",
        title: "Home",
        subtitle: "Your daily overview and favourites",
        icon: "home-outline",
        status: "LIVE",
        onPress: () => (navigation as any).goBack(),
      },
      {
        id: "calendar",
        title: "Calendar",
        subtitle: "Calendar • Taxi • School",
        icon: "calendar-outline",
        status: "LIVE",
        onPress: () => switchTab("Calendar"),
      },
      {
        id: "messages",
        title: "Messages",
        subtitle: "Family chats (Phase 1 shell)",
        icon: "chatbubble-ellipses-outline",
        status: "LIVE",
        onPress: () => switchTab("Messages"),
      },
      {
        id: "birthdays",
        title: "Birthdays",
        subtitle: "Reminders, notes, and tracking",
        icon: "gift-outline",
        status: "LIVE",
        onPress: () => (navigation as any).navigate("Birthdays"),
      },
      {
        id: "bills",
        title: "Bills",
        subtitle: "Keep your family’s bills synchronised.",
        icon: "receipt-outline",
        status: "LIVE",
        onPress: () => (navigation as any).navigate("Bills"),
      },
      {
        id: "settings",
        title: "Settings",
        subtitle: "Profile, family, and app preferences",
        icon: "settings-outline",
        status: "LIVE",
        onPress: () => switchTab("Settings"),
      },

      // Coming soon (visibility only)
      {
        id: "tasks",
        title: "Tasks",
        subtitle: "Shared to-dos (coming soon)",
        icon: "checkmark-done-outline",
        status: "COMING_SOON",
      },
      {
        id: "meals",
        title: "Meals",
        subtitle: "Weekly meal planner (coming soon)",
        icon: "restaurant-outline",
        status: "COMING_SOON",
      },
      {
        id: "childcare",
        title: "Childcare Coverage",
        subtitle: "Coordination view (coming soon)",
        icon: "people-outline",
        status: "COMING_SOON",
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>All features</Text>
        <Text style={styles.subtitle}>
          Everything FamilySync can do — live now and coming soon.
        </Text>

        <View style={styles.card}>
          {rows.map((r, idx) => {
            const isSoon = r.status === "COMING_SOON";
            const disabled = isSoon || !r.onPress;

            const RowWrap: any = disabled ? View : Pressable;

            return (
              <RowWrap
                key={r.id}
                {...(!disabled
                  ? {
                      onPress: r.onPress,
                      style: ({ pressed }: any) => [styles.rowPressable, pressed && styles.rowPressed],
                      accessibilityRole: "button",
                      accessibilityLabel: r.title,
                    }
                  : { style: styles.row })}
              >
                <View style={[styles.rowInner, idx === 0 ? styles.rowInnerFirst : null]}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={r.icon} size={18} color={vars.inkMuted} />
                  </View>

                  <View style={styles.textWrap}>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {r.title}
                      </Text>

                      {isSoon ? (
                        <View style={[styles.pill, styles.pillSoon]}>
                          <Text style={[styles.pillText, styles.pillTextSoon]}>Coming soon</Text>
                        </View>
                      ) : (
                        <View style={styles.pill}>
                          <Text style={styles.pillText}>Live</Text>
                        </View>
                      )}
                    </View>

                    {!!r.subtitle ? (
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {r.subtitle}
                      </Text>
                    ) : null}
                  </View>

                  {!disabled ? <Text style={styles.chev}>›</Text> : null}
                </View>
              </RowWrap>
            );
          })}
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Tip</Text>
          <Text style={styles.tipBody}>
            Home shortcuts are favourites. All Features is where everything lives.
          </Text>
        </View>

        <View style={{ height: Platform.OS === "ios" ? 26 : 18 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: vars.bg },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 24 },

  title: { fontSize: 26, lineHeight: 32, fontWeight: "800", color: vars.ink, marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 18, fontWeight: "600", color: vars.inkMuted, marginBottom: 14 },

  card: {
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 18,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? { shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } }
      : { elevation: 1 }),
  },

  row: {
    // for non-pressable fallback wrapper
  },

  rowPressable: {},

  rowPressed: {
    backgroundColor: "rgba(17,24,39,0.04)",
  },

  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: vars.border,
  },
  rowInnerFirst: {
    borderTopWidth: 0,
  },

  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: vars.border,
  },

  textWrap: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },

  rowTitle: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: "800", color: vars.ink },
  rowSubtitle: { marginTop: 2, fontSize: 13, lineHeight: 16, fontWeight: "600", color: vars.inkMuted },

  chev: { fontSize: 22, lineHeight: 22, fontWeight: "800", color: vars.inkMuted },

  pill: {
    backgroundColor: vars.pillBg,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { color: vars.pillText, fontSize: 12, fontWeight: "800" },

  pillSoon: { backgroundColor: vars.soonBg },
  pillTextSoon: { color: vars.soonText },

  tipCard: {
    marginTop: 12,
    backgroundColor: vars.card,
    borderWidth: 1,
    borderColor: vars.border,
    borderRadius: 18,
    padding: 14,
  },
  tipTitle: { fontSize: 13, fontWeight: "900", color: vars.ink, marginBottom: 6 },
  tipBody: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: vars.inkMuted },
});
