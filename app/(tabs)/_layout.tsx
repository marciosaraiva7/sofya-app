import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,

        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: () => {
          return (
            <BlurView
              intensity={80}
              style={{
                ...StyleSheet.absoluteFillObject,
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                overflow: "hidden",
                backgroundColor: "transparent",
              }}
            />
          );
        },
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
          animation: "fade",
        }}
      />
      <Tabs.Screen
        name="consultation"
        options={{
          title: "Consulta",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="mic" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
