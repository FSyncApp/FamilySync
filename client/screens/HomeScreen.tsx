import React, { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import type { MainTabParamList } from "../navigation/MainTabs";
import { useBirthdayTickerLabel } from "../data/birthdaysStore";

type TodayItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

type ShortcutAction = { kind: "tab"; tab: keyof MainTabParamList } | { kind: "comingSoon" };

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

const TODAY_VISIBLE_ROWS = 4;
const TODAY_AUTO_SCROLL_MS = 4500; // slow, calm
const TODAY_RESUME_DELAY_MS = 1800; // after user interaction



/**
 * Home v1.4.3 Shortcuts (LOCKED 2×3)
 * Phase 1 wiring:
 *  - Calendar → Calendar tab
 *  - Messages → Messages tab
 *  - Settings → Settings tab
 *  - Family → Settings tab (safe home for "family settings" later)
 *  - Birthdays → Birthdays screen (HomeStack)
 *  - Tasks / Meals → "Coming soon" alert (Option A)
 */
const SHORTCUTS: ShortcutItem[] = [
  { id: "s1", icon: "calendar-outline", label: "Calendar", action: { kind: "tab", tab: "Calendar" } },
  { id: "s2", icon: "checkmark-done-outline", label: "Tasks", action: { kind: "comingSoon" } },
  { id: "s3", icon: "restaurant-outline", label: "Meals", action: { kind: "comingSoon" } },
  // Birthdays has an actual Phase 1 screen under HomeStack
  { id: "s4", icon: "gift-outline", label: "Birthdays", action: { kind: "comingSoon" } },
  { id: "s5", icon: "people-outline", label: "Family", action: { kind: "tab", tab: "Settings" } },
  { id: "s6", icon: "settings-outline", label: "Settings", action: { kind: "tab", tab: "Settings" } },
];

export default function HomeScreen() {
  // Phase 1: static placeholders. Wiring to Supabase comes later.
  const userName = "Mark";
  const familyName = "Robson";

  // This screen is mounted inside HomeStack (which itself is mounted under MainTabs).
  // Switching tabs must go via the parent tab navigator; navigating to Birthdays stays within HomeStack.
  const navigation = useNavigation<BottomTabNavigationProp<any>>();

  const birthdayTicker = useBirthdayTickerLabel({ withinDays: 60, rotateWindowDays: 14, rotateEveryMs: 3500 });
  // Today auto-scroll (UI-only behaviour). Keeps manual scrolling enabled.
  const todayScrollRef = useRef<ScrollView | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [todayRowHeight, setTodayRowHeight] = useState<number>(0);
  const [todayIndex, setTodayIndex] = useState<number>(0);
  const [todayUserInteracting, setTodayUserInteracting] = useState<boolean>(false);

  const maxTodayScrollHeight = useMemo(() => {
    if (!todayRowHeight) return 190;
    return todayRowHeight * TODAY_VISIBLE_ROWS;
  }, [todayRowHeight]);

  const clampTodayIndex = (n: number) => {
    const max = Math.max(0, TODAY_ITEMS.length - 1);
    return Math.min(max, Math.max(0, n));
  };



  const onMenuPress = () => {
    // Placeholder for future “all features / menu”
    // Intentionally no navigation yet (Phase 1).
  };

  const onTodayScrollBegin = () => {
    setTodayUserInteracting(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
  };

  const onTodayScrollEnd = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setTodayUserInteracting(false);
    }, TODAY_RESUME_DELAY_MS);
  };

  const onTodayMomentumEnd = (y: number) => {
    if (!todayRowHeight) return;
    const next = clampTodayIndex(Math.round(y / todayRowHeight));
    setTodayIndex(next);
  };

  useEffect(() => {
    // Start/refresh auto-scroll timer.
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = null;

    if (!todayRowHeight) return;
    if (todayUserInteracting) return;

    autoTimerRef.current = setInterval(() => {
      setTodayIndex((prev) => {
        const next = prev + 1 >= TODAY_ITEMS.length ? 0 : prev + 1;
        return next;
      });
    }, TODAY_AUTO_SCROLL_MS);

    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    };
  }, [todayRowHeight, todayUserInteracting]);

  useEffect(() => {
    // Scroll when index changes (auto mode).
    if (todayUserInteracting) return;
    if (!todayRowHeight) return;
    todayScrollRef.current?.scrollTo({ y: todayIndex * todayRowHeight, animated: true });
  }, [todayIndex, todayRowHeight, todayUserInteracting]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    };
  }, []);



  const switchTab = (tab: keyof MainTabParamList) => {
    const parent = (navigation as any).getParent?.();
    if (parent && typeof parent.navigate === "function") {
      parent.navigate(tab);
      return;
    }
    // Fallback: if for any reason we're already in the tab navigator context.
    (navigation as any).navigate(tab);
  };

  const onShortcutPress = (item: ShortcutItem) => {
    // Birthdays is within HomeStack
    if (item.id === "s4") {
      (navigation as any).navigate("Birthdays");
      return;
    }

    if (item.action.kind === "tab") {
      switchTab(item.action.tab);
      return;
    }

    Alert.alert("Coming soon", `${item.label} is coming in a later phase.`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
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
            ref={(r) => { todayScrollRef.current = r; }}
            style={[styles.todayList, { maxHeight: maxTodayScrollHeight }]}
            contentContainerStyle={styles.todayListContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            onScrollBeginDrag={onTodayScrollBegin}
            onScrollEndDrag={onTodayScrollEnd}
            onMomentumScrollBegin={onTodayScrollBegin}
            onMomentumScrollEnd={(e) => { onTodayScrollEnd(); onTodayMomentumEnd(e.nativeEvent.contentOffset.y); }}
            scrollEventThrottle={16}
          >
            {TODAY_ITEMS.map((item, index) => (
              <View
                key={item.id}
                style={[styles.todayRow, index === 0 && styles.todayRowFirst]}
                onLayout={(e) => {
                  if (index === 0 && !todayRowHeight) setTodayRowHeight(e.nativeEvent.layout.height);
                }}
              >
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
        {birthdayTicker.visible ? (
          <View style={styles.birthdayLineWrap}>
            <Text style={styles.birthdayLine}>{birthdayTicker.label}</Text>
          </View>
        ) : null}

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
    marginBottom: 10,
  },
  welcomeTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    color: stylesVars.ink,
    marginBottom: 4,
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
    paddingVertical: 14,
    marginBottom: 14,
  },
  todayHeader: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: stylesVars.ink,
    marginBottom: 10,
  },
  todayList: {
    maxHeight: 190,
  },
  todayListContent: {
    paddingBottom: 4,
  },
  todayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
  },

  // First row should feel “attached” to the card header (no divider above it)
  todayRowFirst: {
    borderTopWidth: 0,
  },
  todayIconWrap: {
    width: 26,
    alignItems: "center",
    marginRight: 10,
  },
  todayTextWrap: {
    flex: 1,
  },
  todayTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    color: stylesVars.ink,
  },
  todaySubtitle: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: stylesVars.inkMuted,
  },

  // Birthday line
  birthdayLineWrap: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  birthdayLine: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: stylesVars.inkMuted,
  },

  // Shortcuts
  shortcutsBlock: {
    marginTop: 2,
  },
  shortcutsLabel: {
    fontSize: 14,
    lineHeight: 18,
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
    width: "31.5%",
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  shortcutText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "700",
    color: stylesVars.ink,
  },

  bottomSpacer: {
    height: Platform.OS === "ios" ? 26 : 18,
  },
});
