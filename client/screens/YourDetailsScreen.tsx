import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";

import type { RootStackParamList } from "../navigation/RootStack";
import Avatar from "../components/Avatar";
import { useIdentityImage } from "../data/identityImagesStore";

/**
 * Phase 2.1 — Your Details polish (2-field names)
 * - Photo is optional and chosen by tapping the circle.
 * - Two fields:
 *    1) Your name (private / for records)
 *    2) Display name (used across the app)
 * - Avatar uses displayName only so placeholder shows 📷 until typing or photo.
 */
type Props = NativeStackScreenProps<RootStackParamList, "YourDetails">;

export default function YourDetailsScreen({ navigation }: Props) {
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const image = useIdentityImage("profile:self");

  const canContinue = useMemo(() => displayName.trim().length >= 2, [displayName]);

  const onPickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Photos not allowed", "Please allow photo access in Settings to add a profile photo.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;
      await image.set(uri);
    } catch {
      Alert.alert("Couldn’t add photo", "Please try again.");
    }
  };

  const onContinue = () => {
    if (!canContinue) return;
    navigation.navigate("FamilyName");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your details</Text>
      <Text style={styles.subtitle}>Add your names and an optional photo. You can edit this later in Settings.</Text>

      <View style={styles.photoBlock}>
        <Text style={styles.photoHint}>Tap the circle to choose a photo (optional)</Text>

        <TouchableOpacity style={styles.avatarTap} activeOpacity={0.85} onPress={onPickPhoto}>
          <Avatar name={displayName} uri={image.uri} size={94} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>+</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Your name</Text>
      <Text style={styles.helper}>For your own records. (Not shown to the family.)</Text>
      <TextInput
        value={legalName}
        onChangeText={setLegalName}
        placeholder="e.g. Mark Robson"
        autoCapitalize="words"
        textContentType={Platform.OS === "ios" ? "name" : "none"}
        style={styles.input}
        returnKeyType="next"
      />

      <Text style={styles.label}>Display name</Text>
      <Text style={styles.helper}>This is how you’ll appear across FamilySync.</Text>
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="e.g. Mark"
        autoCapitalize="words"
        textContentType={Platform.OS === "ios" ? "nickname" : "none"}
        style={styles.input}
        returnKeyType="done"
      />

      <TouchableOpacity style={[styles.cta, !canContinue && { opacity: 0.45 }]} onPress={onContinue} disabled={!canContinue}>
        <Text style={styles.ctaText}>Continue</Text>
      </TouchableOpacity>

      <Text style={styles.small}>Photos are stored locally on this device in Phase 2.1.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 24, backgroundColor: "#FFFFFF" },
  title: { fontSize: 28, fontWeight: "900", color: "#111827" },
  subtitle: { marginTop: 8, fontSize: 15, lineHeight: 20, color: "#4B5563" },

  photoBlock: { marginTop: 16, alignItems: "center" },
  photoHint: { fontSize: 13, fontWeight: "800", color: "#6B7280", textAlign: "center" },
  avatarTap: { marginTop: 10, alignSelf: "center" },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: { color: "#FFFFFF", fontSize: 18, fontWeight: "900", marginTop: -1 },

  label: { marginTop: 18, fontSize: 13, fontWeight: "800", color: "#6B7280" },
  helper: { marginTop: 6, fontSize: 13, lineHeight: 17, color: "#6B7280", textAlign: "left" },
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

  small: { marginTop: 14, fontSize: 12, lineHeight: 16, color: "#6B7280", textAlign: "center" },
});
