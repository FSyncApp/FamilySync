import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";

import type { RootStackParamList } from "../navigation/RootStack";
import Avatar from "../components/Avatar";
import { useIdentityImage } from "../data/identityImagesStore";
import CircularCropperModal from "../components/CircularCropperModal";

type Props = NativeStackScreenProps<RootStackParamList, "YourDetails">;

export default function YourDetailsScreen({ navigation }: Props) {
  const [name, setName] = useState("");
  const image = useIdentityImage("profile:self");

  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const canContinue = useMemo(() => name.trim().length >= 2, [name]);

  const choosePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Photos not allowed", "Please allow photo access in Settings to add a profile photo.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // we do our own circular overlay crop
        quality: 1,
      });

      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      setPendingUri(uri);
      setCropOpen(true);
    } catch {
      Alert.alert("Couldn’t add photo", "Please try again.");
    }
  };

  const onContinue = () => {
    if (!canContinue) return;
    navigation.navigate("FamilyName");
  };

  const hasPhoto = !!image.uri;
  const displayName = name.trim() ? name.trim() : "You";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your details</Text>
      <Text style={styles.subtitle}>Add your name and an optional photo. You can edit this later in Settings.</Text>

      <View style={styles.photoRow}>
        <TouchableOpacity onPress={choosePhoto} activeOpacity={0.85} style={styles.photoTap} accessibilityRole="button">
          <Avatar name={displayName} uri={image.uri} size={94} />
          <View style={styles.photoBadge}>
            <Text style={styles.photoBadgeText}>{hasPhoto ? "✎" : "+"}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.photoCopy}>
          <Text style={styles.photoName}>{displayName}</Text>
          <Text style={styles.photoHint}>Tap the circle to {hasPhoto ? "change" : "choose"} a photo.</Text>

          <TouchableOpacity onPress={choosePhoto} style={styles.photoButton} activeOpacity={0.85}>
            <Text style={styles.photoButtonText}>{hasPhoto ? "Change photo" : "Choose photo"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.label}>Your name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Mark" autoCapitalize="words" style={styles.input} />

      <TouchableOpacity
        style={[styles.cta, !canContinue && { opacity: 0.45 }]}
        onPress={onContinue}
        disabled={!canContinue}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>Continue</Text>
      </TouchableOpacity>

      <Text style={styles.small}>
        Photos are stored locally on this device in Phase 2.1. Family syncing will be enabled in a later phase.
      </Text>

      <CircularCropperModal
        visible={cropOpen}
        uri={pendingUri}
        title="Position your photo"
        onCancel={() => {
          setCropOpen(false);
          setPendingUri(null);
        }}
        onDone={async (resultUri) => {
          await image.set(resultUri);
          setCropOpen(false);
          setPendingUri(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24, backgroundColor: "#FFFFFF" },
  title: { fontSize: 28, fontWeight: "900", color: "#111827" },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 20, color: "#4B5563" },

  photoRow: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  photoTap: { width: 94, height: 94, alignItems: "center", justifyContent: "center" },
  photoBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  photoBadgeText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", marginTop: -1 },

  photoCopy: { flex: 1, minHeight: 94, justifyContent: "center" },
  photoName: { fontSize: 16, fontWeight: "900", color: "#111827" },
  photoHint: { marginTop: 4, fontSize: 13, lineHeight: 17, color: "#6B7280" },
  photoButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D1D5DB",
  },
  photoButtonText: { fontSize: 13, fontWeight: "800", color: "#111827" },

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

  cta: { marginTop: 18, borderRadius: 14, backgroundColor: "#111827", paddingVertical: 14, alignItems: "center" },
  ctaText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },

  small: { marginTop: 14, fontSize: 12, lineHeight: 16, color: "#6B7280" },
});
