import { Image, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>FamilySyncMigrate</Text>

      <Text style={styles.text}>
        Clean runtime confirmed. Template assets removed; migration will proceed
        in controlled slices.
      </Text>
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
  logo: {
    width: 96,
    height: 96,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  text: {
    textAlign: "center",
    opacity: 0.8,
  },
});

