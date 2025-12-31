import React from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

/**
 * All Features (Discovery Surface)
 *
 * Phase 2 Stage 1: navigation + visibility only.
 * - This screen is non-editable.
 * - Some items navigate to existing surfaces.
 * - "Coming soon" items are visible but inert.
 */

type Action =
  | { kind: "tab"; tab: "Home" | "Calendar" | "Messages" | "Settings"; screen?: string }
  | { kind: "route"; route: string }
  | { kind: "none" };

type FeatureItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: Action;
  disabled?: boolean;
};

const stylesVars = {
  bg: "#F5F6F8",
  card: "rgba(255,255,255,0.92)",
  border: "rgba(230,232,238,0.75)",
  ink: "#111827",
  inkMuted: "#6B7280",
};

const LIVE_FEATURES: FeatureItem[] = [
  {
    id: "bills",
    title: "Bills",
    subtitle: "Track what’s due and when",
    icon: "receipt-outline",
    action: { kind: "route", route: "Bills" },
  },
  {
    id: "calendar",
    title: "Calendar",
    subtitle: "Your family’s shared plan",
    icon: "calendar-outline",
    action: { kind: "tab", tab: "Calendar" },
  },
  {
    id: "birthdays",
    title: "Birthdays",
    subtitle: "Keep dates and reminders together",
    icon: "gift-outline",
    action: { kind: "route", route: "Birthdays" },
  },
  {
    id: "messages",
    title: "Messages",
    subtitle: "A shared place to talk",
    icon: "chatbubble-ellipses-outline",
    action: { kind: "tab", tab: "Messages" },
  },
  {
    id: "family",
    title: "Family",
    subtitle: "Members and shared space",
    icon: "people-outline",
    action: { kind: "tab", tab: "Settings", screen: "FamilyMembers" },
  },
];

const COMING_SOON: FeatureItem[] = [
  {
    id: "tasks",
    title: "Tasks",
    subtitle: "Shared to‑dos and checklists",
    icon: "checkmark-done-outline",
    action: { kind: "none" },
    disabled: true,
  },
  {
    id: "meals",
    title: "Meals",
    subtitle: "Basic weekly meal plan",
    icon: "restaurant-outline",
    action: { kind: "none" },
    disabled: true,
  },
  {
    id: "childcare",
    title: "Childcare coverage",
    subtitle: "Who’s got it covered on key dates",
    icon: "heart-outline",
    action: { kind: "none" },
    disabled: true,
  },
  {
    id: "vault",
    title: "Vault",
    subtitle: "Store key family info securely",
    icon: "lock-closed-outline",
    action: { kind: "none" },
    disabled: true,
  },
  {
    id: "location",
    title: "Location sharing",
    subtitle: "Optional family location visibility",
    icon: "navigate-outline",
    action: { kind: "none" },
    disabled: true,
  },
  {
    id: "lists",
    title: "Lists",
    subtitle: "Shopping and shared lists",
    icon: "list-outline",
    action: { kind: "none" },
    disabled: true,
  },
  {
    id: "schedules",
    title: "Schedules",
    subtitle: "Repeat routines and rotations",
    icon: "time-outline",
    action: { kind: "none" },
    disabled: true,
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  item,
  onPress,
  isLast,
}: {
  item: FeatureItem;
  onPress: () => void;
  isLast: boolean;
}) {
  const disabled = !!item.disabled || item.action.kind === "none";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[styles.rowPress, disabled && styles.rowDisabled]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={[styles.row, isLast && styles.rowLast]}>
        <View style={styles.iconWrap}>
          <Ionicons name={item.icon} size={18} color={disabled ? "#9CA3AF" : stylesVars.inkMuted} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, disabled && styles.rowTitleDisabled]} numberOfLines={1}>
            {item.title}
          </Text>
          {!!item.subtitle && (
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          )}
        </View>

        {!disabled ? <Text style={styles.chev}>›</Text> : null}
      </View>
      {!isLast ? <View style={styles.divider} /> : null}
    </TouchableOpacity>
  );
}

export default function AllFeaturesScreen() {
  const navigation = useNavigation<any>();

  const goToTab = (tab: "Home" | "Calendar" | "Messages" | "Settings", screen?: string) => {
    const parent = navigation.getParent?.();
    if (parent && typeof parent.navigate === "function") {
      if (screen) parent.navigate(tab, { screen });
      else parent.navigate(tab);
      return;
    }
    // Fallback
    if (screen) navigation.navigate(tab, { screen });
    else navigation.navigate(tab);
  };

  const goToRoute = (route: string) => {
    navigation.navigate(route);
  };

  const onItemPress = (item: FeatureItem) => {
    if (item.action.kind === "none") return;
    if (item.action.kind === "tab") {
      goToTab(item.action.tab, item.action.screen);
      return;
    }
    if (item.action.kind === "route") {
      goToRoute(item.action.route);
      return;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>All features</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          All the apps to keep your family in sync.
        </Text>

        <Section title="Features">
          {LIVE_FEATURES.map((item, idx) => (
            <Row
              key={item.id}
              item={item}
              onPress={() => onItemPress(item)}
              isLast={idx === LIVE_FEATURES.length - 1}
            />
          ))}
        </Section>

        <Section title="Coming soon">
          {COMING_SOON.map((item, idx) => (
            <Row
              key={item.id}
              item={item}
              onPress={() => onItemPress(item)}
              isLast={idx === COMING_SOON.length - 1}
            />
          ))}
        </Section>

        <View style={{ height: 18 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: stylesVars.bg,
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: stylesVars.ink,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: stylesVars.inkMuted,
    marginBottom: 14,
  },

  section: {
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
    color: stylesVars.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  card: {
    backgroundColor: stylesVars.card,
    borderWidth: 1,
    borderColor: stylesVars.border,
    borderRadius: 18,
    overflow: "hidden",
    ...(Platform.OS === "ios"
      ? {
          shadowOpacity: 0.06,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 10 },
        }
      : { elevation: 1 }),
  },

  rowPress: {},
  rowDisabled: {
    opacity: 0.72,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowLast: {},
  divider: {
    height: 1,
    backgroundColor: "rgba(238,240,245,0.9)",
    marginLeft: 48,
  },

  iconWrap: {
    width: 28,
    alignItems: "center",
  },

  rowTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
    color: stylesVars.ink,
  },
  rowTitleDisabled: {
    color: "#4B5563",
  },
  rowSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "600",
    color: stylesVars.inkMuted,
  },

  chev: {
    fontSize: 22,
    color: "#9CA3AF",
    marginLeft: 6,
    marginTop: -2,
  },
});
