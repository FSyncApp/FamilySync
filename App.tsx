import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import HomeScreen from "./client/screens/HomeScreen";

export default function App() {
  return (
    <NavigationContainer>
      <HomeScreen />
    </NavigationContainer>
  );
}
