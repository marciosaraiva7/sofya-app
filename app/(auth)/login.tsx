import "../../global.css";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { router } from "expo-router";
import React from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

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
      <Text className="text-3xl text-red-600">testando taiwlind</Text>
      <View
        style={{
          padding: 18,
        }}
      >
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
