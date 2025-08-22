import { Button, StyleSheet, TextInput, View } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { router } from "expo-router";
import React from "react";

export default function LoginScreen() {
  const { signIn } = useAuth();

  function handleSignIn() {
    signIn();
    router.replace("/");
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Login</ThemedText>
      <ThemedText type="subtitle">Conecte a sua sessão do desktop</ThemedText>
      <View>
        <TextInput placeholder="Código de 6-dígitos" />
      </View>
      <Button title="Sign In" onPress={handleSignIn} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
