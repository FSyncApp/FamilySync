import React from "react";
import PlaceholderScreen from "./PlaceholderScreen";

export default function CurrencyScreen({ route }: any) {
  return (
    <PlaceholderScreen
      route={{
        params: {
          title: "Currency",
          description: "Currency will be used for future features like allowances, subscriptions, and shared expenses.",
          bullets: ["GBP (£) (default)", "EUR (€) (planned)", "USD ($) (planned)"],
        },
      }}
    />
  );
}
