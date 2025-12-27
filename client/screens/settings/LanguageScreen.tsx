import React from "react";
import PlaceholderScreen from "./PlaceholderScreen";

export default function LanguageScreen({ route }: any) {
  return (
    <PlaceholderScreen
      route={{
        params: {
          title: "Language",
          description:
            "FamilySync will support multiple languages in a future update. Language selection will apply across the whole family.",
          bullets: ["English (default)", "Welsh (planned)", "More languages later"],
        },
      }}
    />
  );
}
