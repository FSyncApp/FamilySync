import React, { useMemo } from "react";
import {
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import type { MainTabParamList } from "../navigation/MainTabs";

type FeatureAction =
  | { kind: "tab"; tab: keyof MainTabParamList; params?: any }
  | { kind: "route"; route: string }
  | { kind: "disabled" };

type FeatureItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  action: FeatureAction;
};

const stylesVars = {
  bg: "#F5F6F8",
  card: "rgba(255,255,255,0.96)",
  border: "rgba(230,232,238,0.9)",
  ink: "#111827",
  inkMuted: "#6B7280",
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Row({ item, onPress }: { item: FeatureItem; onPress?: () => void }) {
  const disabled = item.action.kind === "disabled";

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={item.icon} size={18} color={stylesVars.inkMuted} />
      </View>

      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>

      {/* No status labels. Keep chevron only for navigable rows. */}
      {disabled ? null : <Text style={styles.chev}>›</Text>}
    </TouchableOpacity>
  );
}

/**
 * All Features (Phase 2 Stage 1)
 * - Calm discovery surface
 * - Non-editable
 * - No status labels ("Live now" / "Coming soon")
 * - Childcare Coverage is visible but disabled (concept only)
 */
export default function AllFeaturesScreen() {
  // This screen is accessed from HomeStack, but tab switching must route through the parent tab navigator.
  const navigation = useNavigation<BottomTabNavigationProp<any>>();

  const features = useMemo(() => {
    const core: FeatureItem[] = [
      {
        id: "calendar",
        title: "Calendar",
        subtitle: "Your shared schedule",
        icon: "calendar-outline",
        action: { kind: "tab", tab: "Calendar" },
      },
      {
        id: "messages",
        title: "Messages",
        subtitle: "Family chats and planning",
        icon: "chatbubble-ellipses-outline",
        action: { kind: "tab", tab: "Messages" },
      },
      {
        id: "bills",
        title: "Bills",
        subtitle: "Keep your family’s bills synchronised",
        icon: "receipt-outline",
        action: { kind: "route", route: "Bills" },
      },
      {
        id: "birthdays",
        title: "Birthdays",
        subtitle: "Track upcoming birthdays",
        icon: "gift-outline",
        action: { kind: "route", route: "Birthdays" },
      },
      {
        id: "family",
        title: "Family",
        subtitle: "Family & members",
        icon: "people-outline",
        // NOTE: We intentionally do NOT list "Settings" as a feature.
        // Family is a destination within the Settings tab's stack.
        action: { kind: "tab", tab: "Settings", params: { screen: "FamilyMembers" } as any },
      },
    ];

    const planning: FeatureItem[] = [
      {
        id: "tasks",
        title: "Tasks",
        subtitle: "Shared to-dos",
        icon: "checkmark-done-outline",
        action: { kind: "disabled" },
      },
      {
        id: "meals",
        title: "Meal planner",
        subtitle: "Weekly visibility, simple entries",
        icon: "restaurant-outline",
        action: { kind: "disabled" },
      },
      {
        id: "childcare",
        title: "Childcare coverage",
        subtitle: "Coordinate childcare responsibilities",
        icon: "people-outline",
        action: { kind: "disabled" },
      },
    ];

    return { core, planning };
  }, []);

  const switchTab = (tab: keyof MainTabParamList, params?: any) => {
    const parent = (navigation as any).getParent?.();
    if (parent && typeof parent.navigate === "function") {
      parent.navigate(tab, params);
      return;
    }
    (navigation as any).navigate(tab, params);
  };

  const onPressItem = (item: FeatureItem) => {
    if (item.action.kind === "tab") {
      switchTab(item.action.tab, (item.action as any).params);
      return;
    }
    if (item.action.kind === "route") {
      (navigation as any).navigate(item.action.route);
      return;
    }

    Alert.alert("Not available yet", "This feature will be added in a later phase.");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>All features</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          All the apps to keep your family in sync.
        </Text>

        <SectionTitle>Core</SectionTitle>
        <View style={styles.card}>
          {features.core.map((it, idx) => (
            <View key={it.id}>
              <Row item={it} onPress={() => onPressItem(it)} />
              {idx < features.core.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>

        <SectionTitle>Planning</SectionTitle>
        <View style={styles.card}>
          {features.planning.map((it, idx) => (
            <View key={it.id}>
              <Row item={it} onPress={() => onPressItem(it)} />
              {idx < features.planning.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: stylesVars.bg },

  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
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
    fontWeight: "700",
    color: stylesVars.inkMuted,
    marginBottom: 14,
  },

  sectionTitle: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "800",
    color: stylesVars.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
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

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: stylesVars.border,
    marginLeft: 52,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  rowDisabled: {
    opacity: 0.45,
  },

  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "rgba(245,246,248,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },

  rowText: {
    flex: 1,
    paddingRight: 6,
  },
  rowTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
    color: stylesVars.ink,
  },
  rowSubtitle: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "700",
    color: stylesVars.inkMuted,
  },

  chev: {
    fontSize: 22,
    color: "#9CA3AF",
    marginTop: -2,
    marginLeft: 6,
  },
});
