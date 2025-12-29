import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";

import type { RootStackParamList } from "../navigation/RootStack";
import Avatar from "../components/Avatar";
import CircularCropperModal from "../components/CircularCropperModal";
import { useIdentityImage } from "../data/identityImagesStore";

type Props = NativeStackScreenProps<RootStackParamList, "YourDetails">;

/**
 * Phase 2.1 — YourDetailsScreen
 * - Two name fields: Legal name + Name shown to family (short label)
 * - Photo selection uses our in-app CircularCropperModal (NOT iOS square editor)
 *   so we can show the circular guide overlay consistently.
 */
export default function YourDetailsScreen({ navigation }: Props) {
  const [legalName, setLegalName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const image = useIdentityImage("profile:self");

  // Cropper modal state
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [cropVisible, setCropVisible] = useState(false);

  const displayName = familyName.trim() || legalName.trim();

  const canContinue = useMemo(() => displayName.trim().length >= 2, [displayName]);

  const onPickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Photos not allowed", "Please allow photo access in Settings to add a profile photo.");
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

  const onContinue = () => {
    if (!canContinue) return;
    navigation.navigate("FamilyName");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your details</Text>
      <Text style={styles.subtitle}>Add your name and an optional photo. You can edit this later in Settings.</Text>

      <View style={styles.photoRow}>
        <TouchableOpacity onPress={onPickPhoto} activeOpacity={0.85} style={styles.photoTap}>
          <Avatar name={displayName} uri={image.uri} size={94} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.photoHelper}>Tap the circle to choose a photo</Text>
          <Text style={styles.photoHelperSmall}>{image.uri ? "Tap again to change it" : "Optional"}</Text>
        </View>
      </View>

      <Text style={styles.label}>Legal name</Text>
      <TextInput
        value={legalName}
        onChangeText={setLegalName}
        placeholder="e.g. Mark Robson"
        autoCapitalize="words"
        style={styles.input}
      />

      <Text style={styles.label}>Name shown to family</Text>
      <TextInput
        value={familyName}
        onChangeText={setFamilyName}
        placeholder="e.g. Mark"
        autoCapitalize="words"
        style={styles.input}
      />

      <TouchableOpacity
        style={[styles.cta, !canContinue && { opacity: 0.45 }]}
        onPress={onContinue}
        disabled={!canContinue}
      >
        <Text style={styles.ctaText}>Continue</Text>
      </TouchableOpacity>

      <Text style={styles.small}>
        Photos are stored locally on this device in Phase 2.1. Family syncing will be enabled in a later phase.
      </Text>

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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24, backgroundColor: "#FFFFFF" },
  title: { fontSize: 28, fontWeight: "900", color: "#111827" },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 20, color: "#4B5563" },

  photoRow: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  photoTap: { borderRadius: 9999 },
  photoHelper: { fontSize: 15, fontWeight: "800", color: "#111827" },
  photoHelperSmall: { marginTop: 2, fontSize: 13, color: "#6B7280" },

  label: { marginTop: 18, fontSize: 13, fontWeight: "800", color: "#6B7280" },
  input: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D1D5DB",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#111827",
  },

  cta: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: "#111827",
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },

  small: { marginTop: 14, fontSize: 12, lineHeight: 16, color: "#6B7280" },
});
