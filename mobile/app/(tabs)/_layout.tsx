import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../src/auth";
import { colors } from "../../src/ui";

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) => ({ color, size }: { color: string; size: number }) => <Ionicons name={name} color={color} size={size} />;

export default function TabsLayout() {
  const { user, loading } = useAuth();
  if (!loading && !user) return <Redirect href="/login" />;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerTitleStyle: { fontWeight: "700" },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Tra cứu", tabBarIcon: icon("search") }} />
      <Tabs.Screen name="loans" options={{ title: "Sách của tôi", tabBarIcon: icon("book") }} />
      <Tabs.Screen name="rooms" options={{ title: "Mượn phòng", tabBarIcon: icon("people") }} />
      <Tabs.Screen name="chat" options={{ title: "Trợ lý", tabBarIcon: icon("chatbubbles") }} />
      <Tabs.Screen name="account" options={{ title: "Tài khoản", tabBarIcon: icon("person-circle") }} />
    </Tabs>
  );
}
