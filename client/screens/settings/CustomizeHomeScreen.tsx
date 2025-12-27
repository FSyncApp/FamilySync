import React from "react";
import PlaceholderScreen from "./PlaceholderScreen";

export default function CustomizeHomeScreen({ route }: any) {
  return (
    <PlaceholderScreen
      route={{
        params: {
          title: "Customize Home Screen",
          description: "Home customisation will be added in a future phase.",
          bullets: ["Reorder shortcuts", "Choose key info (birthdays vs pickups)", "Quick actions"],
        },
      }}
    />
  );
}
