import React, { useMemo, useRef, useState } from "react";
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
  return `c_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function keyForChild(id: string) {
  return `child:${id}`;
}

export default function AddChildrenScreen({ navigation }: Props) {
  const [children, setChildren] = useState<ChildDraft[]>([{ id: makeId(), name: "", birthday: "" }]);

  // Cropper modal state (shared)
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [cropVisible, setCropVisible] = useState(false);
  const activeChildIdRef = useRef<string | null>(null);

  const canContinue = useMemo(() => true, [children]);

  const addChild = () => setChildren((prev) => [...prev, { id: makeId(), name: "", birthday: "" }]);

  const onUpdate = (id: string, patch: Partial<ChildDraft>) => {
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const onContinue = () => {
    if (!canContinue) return;
    navigation.navigate("InviteAdults");
  };

  const openCropperForChild = async (childId: string) => {
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

      activeChildIdRef.current = childId;
      setPendingUri(uri);
      setCropVisible(true);
    } catch {
      Alert.alert("Couldn’t add photo", "Please try again.");
    }
  };

  const onCropCancel = () => {
    setCropVisible(false);
    setPendingUri(null);
    activeChildIdRef.current = null;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Children</Text>
      <Text style={styles.subtitle}>Add children (optional). You can edit this later in Settings → Family & Members.</Text>

      {children.map((child, index) => {
        const image = useIdentityImage(keyForChild(child.id));

        const onDoneForThisChild = async (resultUri: string) => {
          try {
            await image.set(resultUri);
          } finally {
            setCropVisible(false);
            setPendingUri(null);
            activeChildIdRef.current = null;
          }
        };

        const isActive = activeChildIdRef.current === child.id;

        return (
          <View key={child.id} style={styles.childCard}>
            <Text style={styles.childTitle}>Child {index + 1}</Text>

            <View style={styles.photoRow}>
              <TouchableOpacity onPress={() => openCropperForChild(child.id)} activeOpacity={0.85} style={styles.photoTap}>
                <Avatar name={child.name} uri={image.uri} size={58} />
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text style={styles.photoHelper}>Tap to choose a photo</Text>
                <Text style={styles.photoHelperSmall}>{image.uri ? "Tap again to change it" : "Optional"}</Text>
              </View>
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput
              value={child.name}
              onChangeText={(t) => onUpdate(child.id, { name: t })}
              placeholder="e.g. Isla"
              autoCapitalize="words"
              style={styles.input}
            />

            <Text style={styles.label}>Birthday (optional)</Text>
            <TextInput
              value={child.birthday}
              onChangeText={(t) => onUpdate(child.id, { birthday: t })}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              style={styles.input}
            />

            {/* Only render one cropper modal instance per child to avoid hook issues */}
            {isActive && (
              <CircularCropperModal
                visible={cropVisible}
                uri={pendingUri}
                title="Position your photo"
                onCancel={onCropCancel}
                onDone={onDoneForThisChild}
              />
            )}
          </View>
        );
      })}

      <TouchableOpacity style={styles.addAnother} onPress={addChild}>
        <Text style={styles.addAnotherText}>+ Add another child</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.cta, !canContinue && { opacity: 0.45 }]} onPress={onContinue} disabled={!canContinue}>
        <Text style={styles.ctaText}>Continue</Text>
      </TouchableOpacity>

      <Text style={styles.small}>Photos are stored locally on this device in Phase 2.1.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 24, paddingBottom: 28, backgroundColor: "#FFFFFF" },
  title: { fontSize: 28, fontWeight: "900", color: "#111827" },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 20, color: "#4B5563" },

  childCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  childTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },

  photoRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  photoTap: { borderRadius: 9999 },
  photoHelper: { fontSize: 14, fontWeight: "800", color: "#111827" },
  photoHelperSmall: { marginTop: 2, fontSize: 12, color: "#6B7280" },

  label: { marginTop: 10, fontSize: 13, fontWeight: "800", color: "#6B7280" },
  input: {
    marginTop: 7,
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
