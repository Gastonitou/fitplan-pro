import { Tabs } from "expo-router";
import { View, Text } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0d0d1a",
          borderTopColor: "#1a1a3e",
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 72,
          elevation: 0,
        },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#555",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Übersicht",
          tabBarIcon: ({ focused }) => <TabDot active={focused} label="Ü" />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "Scanner",
          tabBarIcon: ({ focused }) => <TabDot active={focused} label="🍽" />,
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: "Training",
          tabBarIcon: ({ focused }) => <TabDot active={focused} label="T" />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: "Ernährung",
          tabBarIcon: ({ focused }) => <TabDot active={focused} label="E" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ focused }) => <TabDot active={focused} label="P" />,
        }}
      />
    </Tabs>
  );
}

function TabDot({ active, label }: { active: boolean; label: string }) {
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: active ? "#6c63ff" : "#1a1a3e",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        style={{
          color: active ? "#fff" : "#555",
          fontSize: 13,
          fontWeight: "700",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
