import React from "react";
import PlaceholderScreen from "./PlaceholderScreen";

export default function AppearanceScreen({ route }: any) {
  // Phase 1: placeholder only — no toggles to avoid implying OS wiring.
  return (
    <PlaceholderScreen
      route={{
        params: {
          title: "Appearance",
          description: "Appearance settings will be added in a future phase.",
          bullets: ["Light / Dark / System", "Font sizing", "Theme accents"],
        },
      }}
    />
  );
}
