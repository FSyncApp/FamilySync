import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import type { MainTabParamList } from "../navigation/MainTabs";

type TodayItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

type ShortcutAction =
  | { kind: "tab"; tab: keyof MainTabParamList }
  | { kind: "comingSoon" };

type ShortcutItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  action: ShortcutAction;
};

const TODAY_ITEMS: TodayItem[] = [
  { id: "1", icon: "calendar-outline", title: "School drop-off", subtitle: "08:30" },
  { id: "2", icon: "car-outline", title: "Taxi pickup", subtitle: "15:20" },
  { id: "3", icon: "checkmark-circle-outline", title: "Pay nursery invoice", subtitle: "Due today" },
  { id: "4", icon: "time-outline", title: "Dinner plan", subtitle: "Pasta night" },
  { id: "5", icon: "people-outline", title: "Call Nana", subtitle: "Any time" },
];

/**
 * Home v1.4.3 Shortcuts (LOCKED 2×3)
 * Phase 1 wiring:
 *  - Calendar → Calendar tab
 *  - Messages → Messages tab
 *  - Settings → Settings tab
 *  - Family → Settings tab (safe home for "family settings" later)
 *  - Tasks / Meals → "Coming soon" alert (Option A)
 */
const SHORTCUTS: ShortcutItem[] = [
  { id: "s1", icon: "calendar-outline", label: "Calendar", action: { kind: "tab", tab: "Calendar" } },
  { id: "s2", icon: "checkmark-done-outline", label: "Tasks", action: { kind: "comingSoon" } },
  { id: "s3", icon: "restaurant-outline", label: "Meals", action: { kind: "comingSoon" } },
  { id: "s4", icon: "chatbubble-ellipses-outline", label: "Messages", action: { kind: "tab", tab: "Messages" } },
  { id: "s5", icon: "people-outline", label: "Family", action: { kind: "tab", tab: "Settings" } },
  { id: "s6", icon: "settings-outline", label: "Settings", action: { kind: "tab", tab: "Settings" } },
];

export default function HomeScreen() {
  // Phase 1: static placeholders. Wiring to Supabase comes later.
  const userName = "Mark";
  const familyName = "Robson";

  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const onMenuPress = () => {
    // Placeholder for future “all features / menu”
    // Intentionally no navigation yet (Phase 1).
  };

  const onShortcutPress = (item: ShortcutItem) => {
    if (item.action.kind === "tab") {
      navigation.navigate(item.action.tab);
      return;
    }
    Alert.alert("Coming soon", `${item.label} is coming in a later phase.`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top App Chrome (scrolls with page, not sticky) */}
        <View style={styles.topChrome}>
          <View style={styles.brandLeft}>
            <View style={styles.appIcon} />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            onPress={onMenuPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.menuButton}
          >
            <Ionicons name="menu-outline" size={24} color={stylesVars.ink} />
          </TouchableOpacity>
        </View>

        {/* Welcome & Context */}
        <View style={styles.welcomeBlock}>
          <Text style={styles.welcomeTitle}>Welcome back, {userName}</Text>
          <Text style={styles.familySubtitle}>{familyName} Family</Text>
        </View>

        {/* Today Container (CORE) */}
        <View style={styles.todayContainer}>
          <Text style={styles.todayHeader}>Here’s what’s happening today</Text>

          <ScrollView
            style={styles.todayList}
            contentContainerStyle={styles.todayListContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {TODAY_ITEMS.map((item) => (
              <View key={item.id} style={styles.todayRow}>
                <View style={styles.todayIconWrap}>
                  <Ionicons name={item.icon} size={18} color={stylesVars.inkMuted} />
                </View>

                <View style={styles.todayTextWrap}>
                  <Text style={styles.todayTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={styles.todaySubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Birthday Indicator (LOCKED) */}
        <View style={styles.birthdayLineWrap}>
          <Text style={styles.birthdayLine}>Emma’s birthday in 3 days</Text>
        </View>

        {/* Shortcuts (LOCKED) */}
        <View style={styles.shortcutsBlock}>
          <Text style={styles.shortcutsLabel}>Shortcuts</Text>

          <View style={styles.shortcutsGrid}>
            {SHORTCUTS.map((sc) => (
              <TouchableOpacity
                key={sc.id}
                accessibilityRole="button"
                accessibilityLabel={sc.label}
                onPress={() => onShortcutPress(sc)}
                activeOpacity={0.8}
                style={styles.shortcutTile}
              >
                <View style={styles.shortcutIcon}>
                  <Ionicons name={sc.icon} size={20} color={stylesVars.inkMuted} />
                </View>
                <Text style={styles.shortcutText} numberOfLines={1}>
                  {sc.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom empty space (expected, until future sections/nav) */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const stylesVars = {
  bg: "#F5F6F8",
  card: "#FFFFFF",
  border: "#E6E8EE",
  ink: "#111827",
  inkMuted: "#6B7280",
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },

  page: {
    flex: 1,
  },
  pageContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },

  // Top chrome
  topChrome: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  brandLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  appIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#111827",
    opacity: 0.9,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: "center",
    justifyContent: "center",
  },

  // Welcome & context
  welcomeBlock: {
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    color: stylesVars.ink,
    marginBottom: 6,
  },
  familySubtitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
    color: stylesVars.inkMuted,
  },

  // Today container
  todayContainer: {
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 12,
  },
  todayHeader: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: stylesVars.ink,
    marginBottom: 10,
  },
  todayList: {
    maxHeight: 180,
  },
  todayListContent: {
    paddingBottom: 6,
  },
  todayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
  },
  todayIconWrap: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  todayTextWrap: {
    flex: 1,
  },
  todayTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "600",
    color: stylesVars.ink,
  },
  todaySubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "500",
    color: stylesVars.inkMuted,
  },

  // Birthday indicator (single reserved line)
  birthdayLineWrap: {
    marginTop: 2,
    marginBottom: 18,
  },
  birthdayLine: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: stylesVars.inkMuted,
  },

  // Shortcuts
  shortcutsBlock: {
    marginTop: 2,
  },
  shortcutsLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: stylesVars.ink,
    marginBottom: 10,
  },
  shortcutsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  shortcutTile: {
    width: "31.5%", // 3 columns with space-between (locks 2×3 given 6 tiles)
    minHeight: 88,
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  shortcutIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#F2F3F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  shortcutText: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "600",
    color: stylesVars.ink,
  },

  bottomSpacer: {
    height: 26,
  },
});
