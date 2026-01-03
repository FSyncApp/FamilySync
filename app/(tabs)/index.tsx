import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { router } from "expo-router";

import { useBirthdayTickerLabel } from "../../migration_src/client/data/birthdaysStore";

type TodayItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

type ShortcutItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const TODAY_ITEMS: TodayItem[] = [
  { id: "1", icon: "calendar-outline", title: "School drop-off", subtitle: "08:30" },
  { id: "2", icon: "car-outline", title: "Taxi pickup", subtitle: "15:20" },
  { id: "3", icon: "checkmark-circle-outline", title: "Pay nursery invoice", subtitle: "Due today" },
  { id: "4", icon: "time-outline", title: "Dinner plan", subtitle: "Pasta night" },
  { id: "5", icon: "people-outline", title: "Call Nana", subtitle: "Any time" },
];

const SHORTCUTS: ShortcutItem[] = [
  { id: "s1", icon: "calendar-outline", label: "Calendar" },
  { id: "s2", icon: "checkmark-done-outline", label: "Tasks" },
  { id: "s3", icon: "restaurant-outline", label: "Meals" },
  { id: "s4", icon: "gift-outline", label: "Birthdays" },
  { id: "s5", icon: "people-outline", label: "Family" },
  { id: "s6", icon: "receipt-outline", label: "Bills" },
];

const TODAY_VISIBLE_ROWS = 4;
const TODAY_AUTO_SCROLL_MS = 4500; // slow, calm
const TODAY_RESUME_DELAY_MS = 1800; // after user interaction
const TODAY_SCROLL_ANIM_GUARD_MS = 650;

const stylesVars = {
  ink: "#101828",
  inkMuted: "#667085",
  card: "rgba(255,255,255,0.92)",
  cardStrong: "rgba(255,255,255,0.98)",
  border: "rgba(220,223,232,0.75)",
  shadow: "rgba(16,24,40,0.06)",
  accent: "#111827",
};

export default function HomeScreen() {
  // Phase 1: static placeholders. Wiring comes later.
  const userName = "Mark";
  const familyName = "Robson";

  const birthdayTicker = useBirthdayTickerLabel({
    withinDays: 60,
    rotateWindowDays: 14,
    rotateEveryMs: 3500,
  });

  // Today auto-scroll
  const todayScrollRef = useRef<ScrollView | null>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const normalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentOffsetRef = useRef<number>(0);

  const [todayRowHeight, setTodayRowHeight] = useState<number>(0);
  const [todayUserInteracting, setTodayUserInteracting] = useState<boolean>(false);

  const todayLoopItems = useMemo(() => [...TODAY_ITEMS, ...TODAY_ITEMS], []);
  const todayCycleHeight = useMemo(() => (todayRowHeight ? todayRowHeight * TODAY_ITEMS.length : 0), [todayRowHeight]);

  const maxTodayScrollHeight = useMemo(() => {
    if (!todayRowHeight) return 190;
    return todayRowHeight * TODAY_VISIBLE_ROWS;
  }, [todayRowHeight]);

  const clearNormalizeTimer = () => {
    if (normalizeTimerRef.current) clearTimeout(normalizeTimerRef.current);
    normalizeTimerRef.current = null;
  };

  const normalizeIfNeeded = (y: number) => {
    if (!todayCycleHeight) return;
    if (y >= todayCycleHeight) {
      const nextY = y - todayCycleHeight;
      todayScrollRef.current?.scrollTo({ y: nextY, animated: false });
      currentOffsetRef.current = nextY;
    } else if (y < 0) {
      const nextY = y + todayCycleHeight;
      todayScrollRef.current?.scrollTo({ y: nextY, animated: false });
      currentOffsetRef.current = nextY;
    }
  };

  const onTodayScrollBegin = () => {
    setTodayUserInteracting(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = null;
    clearNormalizeTimer();
  };

  const onTodayScrollEnd = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setTodayUserInteracting(false);
    }, TODAY_RESUME_DELAY_MS);
  };

  useEffect(() => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = null;

    if (!todayRowHeight) return;
    if (todayUserInteracting) return;

    autoTimerRef.current = setInterval(() => {
      if (todayUserInteracting) return;
      const targetY = currentOffsetRef.current + todayRowHeight;

      todayScrollRef.current?.scrollTo({ y: targetY, animated: true });

      clearNormalizeTimer();
      normalizeTimerRef.current = setTimeout(() => {
        if (todayUserInteracting) return;
        normalizeIfNeeded(currentOffsetRef.current);
      }, TODAY_SCROLL_ANIM_GUARD_MS);
    }, TODAY_AUTO_SCROLL_MS);

    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    };
  }, [todayRowHeight, todayUserInteracting, todayCycleHeight]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      clearNormalizeTimer();
    };
  }, []);

  const onMenuPress = () => router.push("/legacy");

  const onShortcutPress = (item: ShortcutItem) => {
    // Calendar is now Router-native.
    if (item.label === "Calendar") {
      router.push("/calendar");
      return;
    }

// Bills is now Router-native.
    if (item.label === "Bills") {
      router.push("/bills");
      return;
    }

    // Everything else stays in legacy for now (deep-link to label where possible).
    router.push({ pathname: "/legacy", params: { to: item.label } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Subtle background gradient without deps */}
      <View pointerEvents="none" style={styles.bgLayer}>
        <View style={styles.bgTopTint} />
        <View style={styles.bgBottomTint} />
      </View>

      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
        {/* Top App Chrome */}
        <View style={styles.topChrome}>
          <View style={styles.brandLeft}>
            <View style={styles.appIcon} />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="All features"
            onPress={onMenuPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.menuButton}
          >
            <Ionicons name="apps-outline" size={22} color={stylesVars.ink} />
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
            ref={(r) => {
              todayScrollRef.current = r;
            }}
            style={{ maxHeight: maxTodayScrollHeight }}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={onTodayScrollBegin}
            onMomentumScrollBegin={onTodayScrollBegin}
            onScrollEndDrag={onTodayScrollEnd}
            onMomentumScrollEnd={onTodayScrollEnd}
            onScroll={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              currentOffsetRef.current = y;

              clearNormalizeTimer();
              normalizeTimerRef.current = setTimeout(() => {
                if (todayUserInteracting) return;
                normalizeIfNeeded(currentOffsetRef.current);
              }, TODAY_SCROLL_ANIM_GUARD_MS);
            }}
            scrollEventThrottle={16}
          >
            {todayLoopItems.map((item, idx) => {
              const isFirst = idx % TODAY_ITEMS.length === 0;
              return (
                <View
                  key={`${item.id}-${idx}`}
                  style={[styles.todayRow, isFirst && styles.todayRowFirst]}
                  onLayout={(e) => {
                    if (idx === 0 && !todayRowHeight) {
                      setTodayRowHeight(e.nativeEvent.layout.height);
                    }
                  }}
                >
                  <View style={styles.todayIconWrap}>
                    <Ionicons name={item.icon} size={18} color={stylesVars.inkMuted} />
                  </View>

                  <View style={styles.todayTextWrap}>
                    <Text style={styles.todayTitle}>{item.title}</Text>
                    {!!item.subtitle && <Text style={styles.todaySubtitle}>{item.subtitle}</Text>}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Birthdays ticker */}
        {birthdayTicker.visible && (
          <View style={styles.birthdayTickerWrap}>
            <Text style={styles.birthdayTickerText}>{birthdayTicker.label}</Text>
          </View>
        )}

        {/* Shortcuts (LOCKED 2×3) */}
        <View style={styles.shortcutsBlock}>
          <Text style={styles.shortcutsTitle}>Shortcuts</Text>

          <View style={styles.shortcutsGrid}>
            {SHORTCUTS.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={styles.shortcutTile}
                activeOpacity={0.88}
                onPress={() => onShortcutPress(s)}
              >
                <View style={styles.shortcutIconWrap}>
                  <Ionicons name={s.icon} size={20} color={stylesVars.ink} />
                </View>
                <Text style={styles.shortcutLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6FA" },

  bgLayer: { ...StyleSheet.absoluteFillObject },
  bgTopTint: { height: "60%", backgroundColor: "#F7F8FC" },
  bgBottomTint: { flex: 1, backgroundColor: "#F1F4F8" },

  page: { flex: 1 },
  pageContent: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 22 },

  topChrome: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  brandLeft: { flexDirection: "row", alignItems: "center" },
  appIcon: { width: 28, height: 28, borderRadius: 7, backgroundColor: stylesVars.accent },

  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: stylesVars.cardStrong,
    borderWidth: 1,
    borderColor: stylesVars.border,
    alignItems: "center",
    justifyContent: "center",
  },

  welcomeBlock: { marginBottom: 14 },
  welcomeTitle: { fontSize: 28, fontWeight: "800", color: stylesVars.ink, letterSpacing: -0.2 },
  familySubtitle: { marginTop: 4, fontSize: 16, fontWeight: "700", color: stylesVars.inkMuted },

  todayContainer: {
    backgroundColor: stylesVars.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: stylesVars.border,
    shadowColor: stylesVars.shadow,
    shadowOpacity: Platform.OS === "ios" ? 1 : 0,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    marginBottom: 12,
  },
  todayHeader: { fontSize: 14, fontWeight: "800", color: stylesVars.ink, marginBottom: 10 },

  todayRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: stylesVars.border,
    alignItems: "center",
  },
  todayRowFirst: { borderTopWidth: 0 },
  todayIconWrap: { width: 26, alignItems: "center" },
  todayTextWrap: { marginLeft: 10, flex: 1 },
  todayTitle: { fontSize: 14, fontWeight: "800", color: stylesVars.ink },
  todaySubtitle: { marginTop: 2, fontSize: 13, fontWeight: "700", color: stylesVars.inkMuted },

  birthdayTickerWrap: { marginBottom: 14, paddingHorizontal: 2 },
  birthdayTickerText: { fontSize: 13, fontWeight: "700", color: stylesVars.inkMuted },

  shortcutsBlock: { marginTop: 2 },
  shortcutsTitle: { fontSize: 14, fontWeight: "800", color: stylesVars.ink, marginBottom: 10 },

  shortcutsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  shortcutTile: {
    width: "31.5%",
    backgroundColor: stylesVars.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: stylesVars.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  shortcutIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(17,24,39,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  shortcutLabel: { fontSize: 12, fontWeight: "800", color: stylesVars.ink, textAlign: "center" },

  bottomSpacer: { height: Platform.OS === "ios" ? 26 : 18 },
});
