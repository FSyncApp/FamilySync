import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";

export default function BillsFormScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
          <Text style={styles.backTxt}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bills form (stub)</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.p}>
          This is a temporary stub to unblock a syntax error. Next patch will migrate the real BillForm screen.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  header: { paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  backTxt: { fontWeight: "700" },
  title: { marginTop: 10, fontSize: 18, fontWeight: "800" },
  body: { flex: 1, justifyContent: "center" },
  p: { opacity: 0.8, lineHeight: 20 },
});
