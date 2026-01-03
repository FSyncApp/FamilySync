import { Redirect } from "expo-router";

export default function SettingsTab() {
  return <Redirect href={{ pathname: "/legacy", params: { to: "Settings" } }} />;
}
