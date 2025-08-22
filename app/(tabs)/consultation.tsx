import { Button, StyleSheet } from "react-native";

import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { router } from "expo-router";

export default function TabTwoScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#e8f0fc", dark: "#6b86d6" }}
      headerImage={
        <IconSymbol
          size={250}
          color="#9cb1f0"
          name="mic"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Consulta</ThemedText>
      </ThemedView>
      <ThemedText>Inicie uma consulta com o seu médico.</ThemedText>
      <Button
        title="Iniciar nova consulta"
        color="#6b86d6"
        onPress={() => router.push("/record")}
      />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: "#808080",
    bottom: -30,
    left: 15,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
});
