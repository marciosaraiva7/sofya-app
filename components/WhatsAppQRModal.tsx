import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Button, Image, Modal, StyleSheet, Text, View } from "react-native";

interface WhatsAppQRModalProps {
  visible: boolean;
  onClose: () => void;
}

function WhatsAppQRModal({ visible, onClose }: WhatsAppQRModalProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(25);

  const refreshInterval = useRef<NodeJS.Timeout | null>(null);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  async function generateQRCode() {
    setLoading(true);
    const newUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${Date.now()}`;
    setQrUrl(newUrl);
    setCountdown(25);
    setLoading(false);
  }

  useEffect(() => {
    if (visible) {
      generateQRCode();
      refreshInterval.current = setInterval(generateQRCode, 25000);
      countdownInterval.current = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (refreshInterval.current) clearInterval(refreshInterval.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      setCountdown(25);
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {loading ? (
            <ActivityIndicator size="large" />
          ) : (
            <Image source={{ uri: qrUrl ?? undefined }} style={styles.qr} />
          )}
          <Text style={styles.countdown}>Atualizando em: {countdown}s</Text>
          <Button title="Fechar" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  container: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  qr: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  countdown: {
    marginVertical: 8,
  },
});

export default WhatsAppQRModal;
