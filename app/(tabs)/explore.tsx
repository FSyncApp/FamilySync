import { Image, StyleSheet, Text, View, Platform } from "react-native";

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore</Text>

      <Text style={styles.text}>
        This is the default template screen. We&apos;ll replace it during
        migration.
      </Text>

      <Image
        source={require("../../assets/icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.text}>Platform: {Platform.OS}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  text: {
    opacity: 0.8,
  },
  logo: {
    width: 96,
    height: 96,
    alignSelf: "center",
  },
});

