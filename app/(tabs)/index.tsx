import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FamilySyncMigrate</Text>

      <Text style={styles.text}>
        Clean runtime confirmed. Next: open the legacy FamilySync UI inside this
        clean project.
      </Text>

      <Pressable style={styles.button} onPress={() => router.push("/legacy")}>
        <Text style={styles.buttonText}>Open Legacy FamilySync UI</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  text: {
    textAlign: "center",
    opacity: 0.8,
    maxWidth: 320,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
