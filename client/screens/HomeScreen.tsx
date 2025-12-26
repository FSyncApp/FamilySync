import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";

type QuickLinkKey =
  | "calendar"
  | "tasks"
  | "meals"
  | "birthdays"
  | "shopping"
  | "timetable"
  | "settings";

type QuickLink = {
  key: QuickLinkKey;
  label: string;
  emoji: string;
};

const STORAGE_KEY = "familysync.quicklinks.v1";

// Define the universe of links you might want.
// For v1 these are just placeholders. Later we’ll wire navigation routes.
const ALL_LINKS: QuickLink[] = [
  { key: "calendar", label: "Calendar", emoji: "📅" },
  { key: "tasks", label: "Tasks", emoji: "✅" },
  { key: "meals", label: "Meals", emoji: "🍽️" },
  { key: "birthdays", label: "Birthdays", emoji: "🎂" },
  { key: "shopping", label: "Shopping", emoji: "🛒" },
  { key: "timetable", label: "Timetable", emoji: "🕒" },
  { key: "settings", label: "Settings", emoji: "⚙️" },
];

// Default “most used” quick links (can be edited)
const DEFAULT_ACTIVE_KEYS: QuickLinkKey[] = ["calendar", "tasks", "meals", "shopping"];

type PersistedState = {
  activeKeys: QuickLinkKey[];
  orderKeys: QuickLinkKey[];
};

function clampActiveOrder(
  activeKeys: QuickLinkKey[],
  orderKeys: QuickLinkKey[],
  allKeys: QuickLinkKey[]
) {
  const activeSet = new Set(activeKeys.filter((k) => allKeys.includes(k)));
  const dedupOrder = Array.from(new Set(orderKeys.filter((k) => allKeys.includes(k))));

  // Ensure all keys appear somewhere in order (active first is NOT required; we keep a master order)
  const missing = allKeys.filter((k) => !dedupOrder.includes(k));
  const mergedOrder = [...dedupOrder, ...missing];

  // Active keys should keep the order they appear in mergedOrder
  const activeInOrder = mergedOrder.filter((k) => activeSet.has(k));
  return { activeKeys: activeInOrder, orderKeys: mergedOrder };
}

export default function HomeScreen() {
  const allKeys = useMemo(() => ALL_LINKS.map((l) => l.key), []);
  const [isEditMode, setIsEditMode] = useState(false);

  // orderKeys = master ordering for all items (active + inactive)
  const [orderKeys, setOrderKeys] = useState<QuickLinkKey[]>(() => allKeys);
  const [activeKeys, setActiveKeys] = useState<QuickLinkKey[]>(() => DEFAULT_ACTIVE_KEYS);

  const orderedLinks = useMemo(() => {
    const map = new Map<QuickLinkKey, QuickLink>();
    for (const l of ALL_LINKS) map.set(l.key, l);

    return orderKeys
      .map((k) => map.get(k))
      .filter(Boolean) as QuickLink[];
  }, [orderKeys]);

  const activeLinks = useMemo(() => {
    const activeSet = new Set(activeKeys);
    return orderedLinks.filter((l) => activeSet.has(l.key));
  }, [activeKeys, orderedLinks]);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed: PersistedState = JSON.parse(raw);
      const next = clampActiveOrder(
        parsed.activeKeys ?? DEFAULT_ACTIVE_KEYS,
        parsed.orderKeys ?? allKeys,
        allKeys
      );
      setActiveKeys(next.activeKeys);
      setOrderKeys(next.orderKeys);
    } catch {
      // If storage is corrupt, ignore and keep defaults.
    }
  }, [allKeys]);

  const save = useCallback(
    async (nextActive: QuickLinkKey[], nextOrder: QuickLinkKey[]) => {
      const next = clampActiveOrder(nextActive, nextOrder, allKeys);
      setActiveKeys(next.activeKeys);
      setOrderKeys(next.orderKeys);
      try {
        const payload: PersistedState = {
          activeKeys: next.activeKeys,
          orderKeys: next.orderKeys,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    },
    [allKeys]
  );

  useEffect(() => {
    load();
  }, [load]);

  const onPressLink = useCallback((link: QuickLink) => {
    Alert.alert("Quick Link", `${link.label} tapped (wire navigation later)`);
  }, []);

  const toggleActive = useCallback(
    (key: QuickLinkKey) => {
      const isActive = activeKeys.includes(key);
      const nextActive = isActive
        ? activeKeys.filter((k) => k !== key)
        : [...activeKeys, key];

      // Keep active keys ordered according to orderKeys
      const next = clampActiveOrder(nextActive, orderKeys, allKeys);
      save(next.activeKeys, next.orderKeys);
    },
    [activeKeys, allKeys, orderKeys, save]
  );

  const resetToDefault = useCallback(() => {
    const next = clampActiveOrder(DEFAULT_ACTIVE_KEYS, allKeys, allKeys);
    save(next.activeKeys, next.orderKeys);
    setIsEditMode(false);
  }, [allKeys, save]);

  const screenWidth = Dimensions.get("window").width;
  const tileWidth = useMemo(() => {
    // 4 tiles across with spacing, but adapt down if screen is small
    const padding = 16 * 2;
    const gap = 10;
    const columns = screenWidth < 360 ? 3 : 4;
    return Math.floor((screenWidth - padding - gap * (columns - 1)) / columns);
  }, [screenWidth]);

  const renderQuickLinkTile = useCallback(
    (link: QuickLink) => {
      return (
        <Pressable
          key={link.key}
          onPress={() => onPressLink(link)}
          style={[styles.tile, { width: tileWidth }]}
        >
          <Text style={styles.tileEmoji}>{link.emoji}</Text>
          <Text style={styles.tileLabel} numberOfLines={1}>
            {link.label}
          </Text>
        </Pressable>
      );
    },
    [onPressLink, tileWidth]
  );

  const renderEditRow = useCallback(
    ({ item, drag, isActive }: RenderItemParams<QuickLink>) => {
      const enabled = activeKeys.includes(item.key);

      return (
        <Pressable
          onLongPress={drag}
          onPress={() => toggleActive(item.key)}
          style={[
            styles.editRow,
            enabled ? styles.editRowEnabled : styles.editRowDisabled,
            isActive ? styles.editRowDragging : null,
          ]}
        >
          <View style={styles.editRowLeft}>
            <Text style={styles.editRowEmoji}>{item.emoji}</Text>
            <Text style={styles.editRowLabel}>{item.label}</Text>
          </View>

          <View style={styles.editRowRight}>
            <Text style={[styles.pill, enabled ? styles.pillOn : styles.pillOff]}>
              {enabled ? "On" : "Off"}
            </Text>
            <Text style={styles.dragHint}>⠿</Text>
          </View>
        </Pressable>
      );
    },
    [activeKeys, toggleActive]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>FamilySync</Text>
            <Text style={styles.subtitle}>Home screen loaded correctly</Text>
          </View>

          <View style={styles.headerActions}>
            {isEditMode ? (
              <>
                <Pressable
                  onPress={() => setIsEditMode(false)}
                  style={[styles.headerBtn, styles.headerBtnPrimary]}
                >
                  <Text style={[styles.headerBtnText, styles.headerBtnTextPrimary]}>
                    Done
                  </Text>
                </Pressable>

                <Pressable
                  onPress={resetToDefault}
                  style={[styles.headerBtn, styles.headerBtnGhost]}
                >
                  <Text style={styles.headerBtnText}>Reset</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => setIsEditMode(true)}
                style={[styles.headerBtn, styles.headerBtnGhost]}
              >
                <Text style={styles.headerBtnText}>Edit</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Main content placeholder */}
        <View style={styles.body}>
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>Family Wall (v1)</Text>
            <Text style={styles.placeholderText}>
              Next: we’ll drop in your Home “family wall” layout and keep Quick Links pinned
              at the bottom.
            </Text>
          </View>
        </View>

        {/* Bottom Quick Links / Edit Panel */}
        <View style={styles.bottomPanel}>
          <View style={styles.bottomPanelTop}>
            <Text style={styles.bottomTitle}>Quick Links</Text>
            <Text style={styles.bottomHint}>
              {isEditMode ? "Tap to toggle • Long-press to reorder" : "Tap a link"}
            </Text>
          </View>

          {isEditMode ? (
            <View style={styles.editListWrap}>
              <DraggableFlatList
                data={orderedLinks}
                keyExtractor={(item) => item.key}
                renderItem={renderEditRow}
                onDragEnd={({ data }) => {
                  const nextOrder = data.map((d) => d.key) as QuickLinkKey[];
                  save(activeKeys, nextOrder);
                }}
              />
            </View>
          ) : (
            <View style={styles.tilesRow}>
              {activeLinks.length === 0 ? (
                <Pressable onPress={() => setIsEditMode(true)} style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No Quick Links selected. Tap “Edit” to add some.
                  </Text>
                </Pressable>
              ) : (
                activeLinks.map(renderQuickLinkTile)
              )}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  page: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    color: "#666",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  headerBtnGhost: {
    backgroundColor: "#FFF",
    borderColor: "#E5E5E5",
  },
  headerBtnPrimary: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  headerBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  headerBtnTextPrimary: {
    color: "#FFF",
  },

  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  placeholderCard: {
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 16,
    padding: 14,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },
  placeholderText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },

  bottomPanel: {
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: "#FFF",
  },
  bottomPanelTop: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  bottomTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  bottomHint: {
    fontSize: 12,
    color: "#777",
  },

  tilesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    borderWidth: 1,
    borderColor: "#EDEDED",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tileEmoji: {
    fontSize: 18,
    marginBottom: 6,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111",
  },

  emptyState: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#EEE",
    borderRadius: 14,
    padding: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: "#666",
  },

  editListWrap: {
    height: 260,
  },
  editRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editRowEnabled: {
    borderColor: "#DADADA",
    backgroundColor: "#FFF",
  },
  editRowDisabled: {
    borderColor: "#EFEFEF",
    backgroundColor: "#FAFAFA",
  },
  editRowDragging: {
    opacity: 0.9,
  },
  editRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editRowEmoji: {
    fontSize: 18,
  },
  editRowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  editRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pill: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
  },
  pillOn: {
    backgroundColor: "#111",
    color: "#FFF",
  },
  pillOff: {
    backgroundColor: "#EDEDED",
    color: "#111",
  },
  dragHint: {
    fontSize: 16,
    color: "#777",
  },
});
