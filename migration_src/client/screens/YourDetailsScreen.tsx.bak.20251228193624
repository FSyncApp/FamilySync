import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "YourDetails">;

export default function YourDetailsScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState("");
  const [screenName, setScreenName] = useState("");

  const onContinue = () => {
    if (!fullName.trim() || !screenName.trim()) {
      Alert.alert("Missing details", "Please enter your name and screen name.");
      return;
    }
    navigation.navigate("FamilyName");
  };

  const onAddPhoto = () => {
    Alert.alert("Add photo", "Photo picking will be enabled in a later phase.");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Tell us about you</Text>
        <Text style={styles.subtitle}>This helps personalise your family.</Text>

        <View style={styles.form}>
          <TextInput
            placeholder="Full name"
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            autoCapitalize="words"
          />

          <TextInput
            placeholder="Screen name (e.g. Dad, Mum, Mark)"
            value={screenName}
            onChangeText={setScreenName}
            style={styles.input}
          />

          <TouchableOpacity style={styles.photoButton} onPress={onAddPhoto}>
            <Text style={styles.photoText}>Add profile photo (optional)</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
          <Text style={styles.primaryText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 32,
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E8EE",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  photoButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E8EE",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  photoText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  primaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
