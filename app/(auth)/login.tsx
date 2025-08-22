import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useAuth } from "@/contexts/AuthContext";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import "../../global.css";

export default function LoginScreen() {
  const { signIn } = useAuth();

  function handleSignIn() {
    signIn();
    router.replace("/");
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ThemedView className="flex flex-1 px-4 gap-4 justify-center items-center">
          <Image
            source={require("../../assets/images/logo.png")}
            style={{
              width: 208,
              height: 77,
              objectFit: "contain",
              marginBottom: 12,
            }}
          />
          <Text className="text-xl text-[#6a7282] mb-2">
            Conecte a sua sessão do desktop
          </Text>
          <View className="flex p-4 w-full gap-4 border rounded-2xl mb-4">
            <Text className="text-lg font-semibold">Código da sessão</Text>
            <TextInput
              className="text-xl border p-2 rounded-lg border-gray-300 text-center font-mono"
              placeholder="Código de 6-dígitos"
              keyboardType="number-pad"
            />
            <TouchableOpacity
              className="bg-[#6b86d6] flex flex-row gap-2 justify-center items-center p-4 rounded-lg"
              onPress={handleSignIn}
            >
              <Text className=" text-white">Conectar</Text>
              <IconSymbol color="#ffffff" name="arrow.right" />
            </TouchableOpacity>
          </View>
          <Text className="text-[#6a7282]">
            Obtenha seu código de sessão no aplicativo principal
          </Text>
        </ThemedView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
