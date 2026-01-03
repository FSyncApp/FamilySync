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

const NAME_PLACEHOLDERS = ["Lucy", "Sam", "Noah", "Olivia", "Jack", "Ava", "Mia", "Leo", "Ella", "Theo"];

type ChildCardProps = {
  child: ChildDraft;
  index: number;
  namePlaceholder: string;
  onUpdate: (id: string, patch: Partial<ChildDraft>) => void;
  onRemove: (id: string) => void;
};

function ChildCard({ child, index, namePlaceholder, onUpdate, onRemove }: ChildCardProps) {
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

  const handleRemoveChild = async () => {
    try {
      // Clear any saved photo first (Phase 2/3: identity images are stored locally).
      await image.setUri(null);
    } finally {
      onRemove(child.id);
    }
  };

  return (
    <View style={styles.childCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.childTitle}>Child {index + 1}</Text>

        {index > 0 ? (
          <TouchableOpacity onPress={handleRemoveChild} hitSlop={8} activeOpacity={0.85}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Option A: avatar left of name input */}
      <View style={styles.profileRow}>
        <TouchableOpacity onPress={openCropper} activeOpacity={0.85} style={styles.avatarTap}>
          <Avatar name={child.name} uri={image.uri} size={56} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={child.name}
            onChangeText={(t) => onUpdate(child.id, { name: t })}
            placeholder={`e.g. ${namePlaceholder}`}
            autoCapitalize="words"
            style={styles.input}
          />
        </View>
      </View>

      <Text style={[styles.label, { marginTop: 10 }]}>Birthday (optional)</Text>
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
 * Phase 3.2.1 (UI tidy):
 * - "Add children to your family" title
 * - Remove redundant subtitle; keep only the small reassurance below Continue
 * - Avatar sits left of Name input (compact contact-row layout)
 * - Remove "add photo later" text (affordance is clear)
 * - Rotating name placeholders as new children are added
 * - Remove child cards (child 2+) clears any stored child photo
 */
export default function AddChildrenScreen({ navigation }: Props) {
  const [children, setChildren] = useState<ChildDraft[]>([{ id: makeId(), name: "", birthday: "" }]);

  // Optional step (per spec): user can continue even with no children.
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
      <Text style={styles.title}>Add children to your family</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: 18 }}>
        {children.map((child, index) => {
          const namePlaceholder = NAME_PLACEHOLDERS[index % NAME_PLACEHOLDERS.length];
          return (
            <ChildCard
              key={child.id}
              child={child}
              index={index}
              namePlaceholder={namePlaceholder}
              onUpdate={onUpdate}
              onRemove={onRemoveChild}
            />
          );
        })}

        <TouchableOpacity onPress={onAddChild} style={styles.addAnother} activeOpacity={0.85}>
          <Text style={styles.addAnotherText}>+ Add another child</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.cta, !canContinue && { opacity: 0.45 }]} onPress={onContinue} disabled={!canContinue}>
          <Text style={styles.ctaText}>Continue</Text>
        </TouchableOpacity>

        <Text style={styles.small}>You can add or edit children later in Settings.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24, backgroundColor: "#FFFFFF" },
  title: { fontSize: 28, fontWeight: "900", color: "#111827" },

  childCard: {
    marginTop: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  childTitle: { fontSize: 15, fontWeight: "900", color: "#111827" },
  removeText: { fontSize: 13, fontWeight: "800", color: "#DC2626" },

  profileRow: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  avatarTap: { borderRadius: 9999 },

  label: { marginTop: 0, fontSize: 13, fontWeight: "800", color: "#111827" },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },

  addAnother: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addAnotherText: { fontSize: 16, fontWeight: "800", color: "#111827" },

  cta: { marginTop: 14, backgroundColor: "#111827", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },

  small: { marginTop: 10, fontSize: 12, color: "#6B7280", textAlign: "center" },
});
