import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import BillsListScreen from "../screens/bills/BillsListScreen";
import BillFormScreen from "../screens/bills/BillFormScreen";

export type BillsStackParamList = {
  BillsList: undefined;
  BillForm: { mode: "create" | "edit"; billId?: string } | undefined;
};

const Stack = createNativeStackNavigator<BillsStackParamList>();

export default function BillsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="BillsList" component={BillsListScreen} options={{ title: "Bills" }} />
      <Stack.Screen name="BillForm" component={BillFormScreen} options={{ title: "Add bill" }} />
    </Stack.Navigator>
  );
}
