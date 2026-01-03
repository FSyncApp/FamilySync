import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image } from "react-native";

type Props = {
  name?: string;
  uri?: string | null;
  size?: number;
  /** Whether to show the little + badge (Pattern A). Defaults true. */
  showAddBadge?: boolean;
};

/**
 * Phase 2.1 — Avatar placeholder behavior + Pattern A badge
 * - If no photo AND no typed name -> show camera icon.
 * - As soon as user types a name -> show initials.
 * - If photo exists -> show photo.
 *
 * Badge:
 * - The + badge is rendered OUTSIDE the clipped circle so it can hang beyond the edge.
 */
export default function Avatar({ name, uri, size = 56, showAddBadge = true }: Props) {
  const initials = useMemo(() => {
    const n = (name ?? "").trim();
    if (!n) return "";
    const parts = n.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (a + b).toUpperCase();
  }, [name]);

  const showCamera = !uri && !initials;

  return (
    <View style={[styles.outer, { width: size, height: size }]}>
      {/* Inner clipped circle */}
      <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
        {uri ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : showCamera ? (
          <Text style={[styles.camera, { fontSize: Math.round(size * 0.42) }]}>📷</Text>
        ) : (
          <Text style={[styles.text, { fontSize: Math.round(size * 0.34) }]}>{initials}</Text>
        )}
      </View>

      {/* + badge (hangs outside circle) */}
      {showAddBadge ? (
        <View
          style={[
            styles.badge,
            {
              width: Math.max(22, Math.round(size * 0.28)),
              height: Math.max(22, Math.round(size * 0.28)),
              borderRadius: 9999,
              right: Math.round(size * -0.04),
              bottom: Math.round(size * -0.04),
            },
          ]}
        >
          <Text style={[styles.badgeText, { fontSize: Math.max(14, Math.round(size * 0.16)) }]}>+</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: "relative",
    overflow: "visible",
    alignItems: "center",
    justifyContent: "center",
  },
  circle: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  text: { fontWeight: "900", color: "#111827" },
  camera: { fontWeight: "800", opacity: 0.78 },

  badge: {
    position: "absolute",
    backgroundColor: "#111827",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    marginTop: -1,
  },
});
