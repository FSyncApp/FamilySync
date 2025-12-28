import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";

export default function NewMessageScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.wrap}>
        <Text style={styles.title}>New message</Text>
        <Text style={styles.body}>
          Coming soon.{"\n"}
          In Phase 1 we’re locking the layout and navigation only.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  wrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 20,
    color: "#6B6B6B",
  },
});
