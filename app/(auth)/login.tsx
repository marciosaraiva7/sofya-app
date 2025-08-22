import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { useAuth } from "@/contexts/AuthContext";
import { getMqttClient } from "@/lib/mqtt";
import { useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
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
import "../../global.css";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeCamera, setActiveCamera] = useState<boolean>(false);
  const hasScannedRef = useRef(false);
  async function openQrScanner() {
    try {
      const result = await requestPermission();
      if (result?.granted || permission?.granted) {
        hasScannedRef.current = false; // reset antes de abrir
        setIsScannerOpen(true);
      } else {
        Alert.alert(
          "Permissão negada",
          "Não foi possível acessar a câmera. Habilite a permissão nas configurações."
        );
      }
    } catch {
      Alert.alert("Erro", "Falha ao solicitar permissão da câmera.");
    }
  }
  async function handleSignIn() {
    if (!code.trim()) {
      Alert.alert("Código inválido", "Por favor, digite o código da sessão");
      return;
    }

    setIsLoading(true);

    const client = getMqttClient();
    const topic = `sofya-platform/${code}/transcriptions`;
    console.log(client);
    console.log(topic);
    const onSuccess = () => {
      client.publish(topic, "app_connected");
      setIsLoading(false);
      signIn();
      router.push({
        pathname: "/record",
        params: { sessionCode: code },
      });
    };

    const onError = (message: string) => {
      setIsLoading(false);
      Alert.alert("Erro", message);
    };

    if (client.connected) {
      client.subscribe(topic, (err: any) => {
        if (!err) {
          onSuccess();
        } else {
          onError("Código inválido. Verifique o código da sessão.");
        }
      });
    } else {
      client.once("connect", () => {
        client.subscribe(topic, (err: any) => {
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
  const handleBarCodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (hasScannedRef.current) return; // evita disparos múltiplos
      hasScannedRef.current = true;

      setIsScannerOpen(false); // fecha câmera
      if (data) {
        setCode(data); // seta o estado
        handleSignIn(); // executa imediatamente
      }
    },
    [handleSignIn]
  );

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
  qrButton: {
    backgroundColor: "#0f172a",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  qrButtonText: { color: "#fff", fontWeight: "600" },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerHeader: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scannerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#111827",
    borderRadius: 8,
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  scannerFrame: {
    width: 260,
    height: 260,
    borderWidth: 2,
    borderColor: "#93c5fd",
    borderRadius: 16,
  },
});
