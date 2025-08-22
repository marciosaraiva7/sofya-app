import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useAuth } from "@/contexts/AuthContext";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { getMqttClient } from "@/lib/mqtt";
import "../../global.css";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    if (!code.trim()) {
      Alert.alert("Código inválido", "Por favor, digite o código da sessão");
      return;
    }

    setIsLoading(true);

    const client = getMqttClient();
    const topic = `sofya-platform/${code}/transcriptions`;

    const onSuccess = () => {
      client.publish(topic, "app_connected");
      setIsLoading(false);
      signIn();
      router.replace({
        pathname: "/transcription",
        params: { sessionCode: code },
      });
    };

    const onError = (message: string) => {
      setIsLoading(false);
      Alert.alert("Erro", message);
    };

    if (client.connected) {
      client.subscribe(topic, (err) => {
        if (!err) {
          onSuccess();
        } else {
          onError("Código inválido. Verifique o código da sessão.");
        }
      });
    } else {
      client.once("connect", () => {
        client.subscribe(topic, (err) => {
          if (!err) {
            onSuccess();
          } else {
            onError("Código inválido. Verifique o código da sessão.");
          }
        });
      });
      client.once("error", () => {
        onError("Erro de conexão. Tente novamente.");
      });
    }
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
              value={code}
              onChangeText={setCode}
            />
            <TouchableOpacity
              className="bg-[#6b86d6] flex flex-row gap-2 justify-center items-center p-4 rounded-lg"
              onPress={handleSignIn}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text className=" text-white">Conectar</Text>
                  <IconSymbol color="#ffffff" name="arrow.right" />
                </>
              )}
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
