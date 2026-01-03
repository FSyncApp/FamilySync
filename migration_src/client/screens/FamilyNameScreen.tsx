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

type Props = NativeStackScreenProps<RootStackParamList, "FamilyName">;

export default function FamilyNameScreen({ navigation }: Props) {
  const [familyName, setFamilyName] = useState("");

  const onContinue = () => {
    if (!familyName.trim()) {
      Alert.alert("Missing family name", "Please enter your family name.");
      return;
    }
    navigation.navigate("AddChildren");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Family name</Text>
        <Text style={styles.subtitle}>What should we call your family?</Text>

        <TextInput
          placeholder="e.g. Smith family"
          value={familyName}
          onChangeText={setFamilyName}
          style={styles.input}
          autoCapitalize="words"
          returnKeyType="done"
        />

        <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
          <Text style={styles.primaryText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F5F6F8" },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 32 },
  title: { fontSize: 26, fontWeight: "700", color: "#111827", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#6B7280", marginBottom: 24 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E8EE",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
