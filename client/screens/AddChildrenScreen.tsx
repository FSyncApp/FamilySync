import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";

import type { RootStackParamList } from "../navigation/RootStack";
import Avatar from "../components/Avatar";
import CircularCropperModal from "../components/CircularCropperModal";
import { useIdentityImage } from "../data/identityImagesStore";

type Props = NativeStackScreenProps<RootStackParamList, "AddChildren">;

type ChildDraft = {
  id: string;
  name: string;
  birthday: string;
};

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function keyForChild(childId: string) {
  // Keep stable keying for child photos across sessions
  return `child:${childId}`;
}

const NAME_PLACEHOLDERS = ["Lucy", "Sam", "Noah", "Ava", "Leo", "Mia", "Ella", "Jack", "Sofia", "Max"];

function namePlaceholderForIndex(index: number) {
  const name = NAME_PLACEHOLDERS[index % NAME_PLACEHOLDERS.length];
  return `e.g. ${name}`;
}

type ChildCardProps = {
  child: ChildDraft;
  index: number;
  canRemove: boolean;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<ChildDraft>) => void;
};

function ChildCard({ child, index, canRemove, onRemove, onUpdate }: ChildCardProps) {
  // ✅ Hooks live inside a stable component boundary, not inside the parent map render.
  // This prevents "Rendered more hooks than during the previous render" when adding/removing children.
  const image = useIdentityImage(keyForChild(child.id));

  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [cropVisible, setCropVisible] = useState(false);

  const openCropper = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Photos not allowed", "Please allow photo access in Settings to add a child photo.");
        return;
      }

      // IMPORTANT: do NOT use iOS built-in editor (square crop UI). We want our own cropper.
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      setPendingUri(uri);
      setCropVisible(true);
    } catch {
      Alert.alert("Couldn’t add photo", "Please try again.");
    }
  };

  const onCropCancel = () => {
    setCropVisible(false);
    setPendingUri(null);
  };

  const onCropDone = async (resultUri: string) => {
    try {
      await image.set(resultUri);
    } finally {
      setCropVisible(false);
      setPendingUri(null);
    }
  };

  const handleRemove = async () => {
    try {
      // Clear stored image for this child so it doesn't linger in AsyncStorage.
      await image.set(null);
    } catch {
      // Non-fatal; still remove the card.
    } finally {
      onRemove(child.id);
    }
  };

  return (
    <View style={styles.childCard}>
      <View style={styles.childHeaderRow}>
        <Text style={styles.childTitle}>Child {index + 1}</Text>
        {canRemove ? (
          <TouchableOpacity onPress={handleRemove} activeOpacity={0.85} hitSlop={8}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.photoRow}>
        <TouchableOpacity onPress={openCropper} activeOpacity={0.85} style={styles.photoTap}>
          <Avatar name={child.name} uri={image.uri} size={58} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.photoHelperSmall}>Add photo later</Text>
        </View>
      </View>

      <Text style={styles.label}>Name</Text>
      <TextInput
        value={child.name}
        onChangeText={(t) => onUpdate(child.id, { name: t })}
        placeholder={namePlaceholderForIndex(index)}
        autoCapitalize="words"
        style={styles.input}
      />

      <Text style={styles.label}>Birthday</Text>
      <TextInput
        value={child.birthday}
        onChangeText={(t) => onUpdate(child.id, { birthday: t })}
        placeholder="dd/mm/yyyy"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        style={styles.input}
      />

      <CircularCropperModal
        visible={cropVisible}
        uri={pendingUri}
        title="Position your photo"
        onCancel={onCropCancel}
        onDone={onCropDone}
      />
    </View>
  );
}

/**
 * Phase 2.1 — AddChildrenScreen
 * Phase 3.1 fix:
 * - Resolve "Rendered more hooks than during the previous render" when adding children
 *   by moving per-child hooks/state into a ChildCard component boundary.
 *
 * Phase 3.2 polish:
 * - Children step is optional (Continue always enabled)
 * - Default one child card visible
 * - Rotating example placeholders (Lucy, Sam, Noah…)
 * - "Add photo later" helper text
 * - Remove link available for child #2+
 */
export default function AddChildrenScreen({ navigation }: Props) {
  const [children, setChildren] = useState<ChildDraft[]>([{ id: makeId(), name: "", birthday: "" }]);

  const canContinue = useMemo(() => true, []);

  const onAddChild = () => {
    setChildren((prev) => [...prev, { id: makeId(), name: "", birthday: "" }]);
  };

  const onRemoveChild = (id: string) => {
    setChildren((prev) => prev.filter((c) => c.id !== id));
  };

  const onUpdate = (id: string, patch: Partial<ChildDraft>) => {
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const onContinue = () => {
    if (!canContinue) return;
    navigation.navigate("InviteAdults");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Children</Text>
      <Text style={styles.subtitle}>Add your children&apos;s details. You can skip this and add them later in Settings.</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
        {children.map((child, index) => (
          <ChildCard
            key={child.id}
            child={child}
            index={index}
            canRemove={index >= 1}
            onRemove={onRemoveChild}
            onUpdate={onUpdate}
          />
        ))}

        <TouchableOpacity onPress={onAddChild} style={styles.addAnother} activeOpacity={0.85}>
          <Text style={styles.addAnotherText}>+ Add another child</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.cta, !canContinue && { opacity: 0.45 }]} onPress={onContinue} disabled={!canContinue}>
          <Text style={styles.ctaText}>Continue</Text>
        </TouchableOpacity>

        <Text style={styles.small}>You can edit children and birthdays later in Settings.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24, backgroundColor: "#FFFFFF" },
  title: { fontSize: 28, fontWeight: "900", color: "#111827" },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 20, color: "#4B5563" },

  childCard: {
    marginTop: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
  },

  childHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  childTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },
  removeText: { fontSize: 13, fontWeight: "800", color: "#B91C1C" },

  photoRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  photoTap: { borderRadius: 9999 },

  // Keep this subtle — onboarding should not feel like a help manual.
  photoHelperSmall: { fontSize: 12, color: "#6B7280" },

  label: { marginTop: 14, fontSize: 13, fontWeight: "800", color: "#6B7280" },
  input: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D1D5DB",
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#111827",
  },

  addAnother: { marginTop: 12, paddingVertical: 12, alignItems: "center" },
  addAnotherText: { fontSize: 15, fontWeight: "800", color: "#111827" },

  cta: { marginTop: 10, borderRadius: 14, backgroundColor: "#111827", paddingVertical: 14, alignItems: "center" },
  ctaText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },

  small: { marginTop: 14, fontSize: 12, lineHeight: 16, color: "#6B7280" },
});
