import { IconSymbol } from "@/components/ui/IconSymbol";
import { getMqttClient, releaseMqttClient } from "@/lib/mqtt";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import WebView, { WebViewMessageEvent } from "react-native-webview";

type BridgeMessage =
  | { type: "ready"; data?: any }
  | {
      type: "transcriptionStarted";
      data?: { message: string; isTranscribing: boolean };
    }
  | {
      type: "recognizing";
      data: { transcription: string; isTranscribing: boolean };
    }
  | {
      type: "recognized";
      data: { transcription: string; isTranscribing: boolean };
    }
  | {
      type: "transcriptionStopped";
      data: { message: string; transcription: string; isTranscribing: boolean };
    }
  | {
      type: "transcriptionState";
      data: { transcription: string; isTranscribing: boolean };
    }
  | {
      type: "recognizedState";
      data: { transcription: string; isTranscribing: boolean };
    }
  | { type: "error"; data: { error: string; details?: any } }
  | { type: string; data?: any };

export default function Record() {
  const webviewRef = useRef<WebView>(null);
  const clientRef = React.useRef<any>(null);

  const [isReady, setIsReady] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionLive, setTranscriptionLive] = useState(""); // parcial (recognizing)
  const [transcriptionFinal, setTranscriptionFinal] = useState(""); // acumulado (recognized)
  const [isConnected, setIsConnected] = useState<boolean>();
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const [transcriptionUpdate, setTranscriptionUpdate] = useState<string>(""); // new state for transcriptionUpdate

  const { sessionCode } = useLocalSearchParams();

  const topic =
    typeof sessionCode === "string" && sessionCode
      ? `sofya-platform/${sessionCode}/transcriptions`
      : "";

  React.useEffect(() => {
    if (!topic) return;
    const client = getMqttClient();
    clientRef.current = client;
    if (client.connected) {
      setIsConnected(true);
    } else {
      client.once("connect", () => {
        setIsConnected(true);
      });
      client.once("error", () => {
        setIsConnected(false);
      });
    }
    return () => {
      if (clientRef.current && topic) {
        clientRef.current.unsubscribe(topic);
      }
      releaseMqttClient();
    };
  }, [topic]);

  const publishTranscription = (text: string) => {
    if (clientRef.current && isConnected && topic) {
      clientRef.current.publish(topic, text);
    }
  };

  useEffect(() => {
    if (transcriptionUpdate) {
      updateTranscription(transcriptionUpdate);
    }
  }, [transcriptionUpdate]);

  const updateTranscription = (newLine: string) => {
    if (!newLine) return;
    setTranscriptionFinal((prev) => (prev ? prev + "\n" + newLine : newLine));
    // Envia apenas a última linha transcrita
    publishTranscription(newLine);
  };

  const handleDisconnect = () => {
    clientRef.current.publish(topic, "app_disconnected");
    router.push("/");
  };

  const handleTranscriptionFinish = () => {
    if (clientRef.current && topic) {
      clientRef.current.publish(topic, "app_disconnected");
      clientRef.current.unsubscribe(topic);
    }
    releaseMqttClient();
  };

  // Utilitário: envia um comando para dentro do WebView
  const postCommand = useCallback((type: string, data: any = {}) => {
    const payload = JSON.stringify({ type, ...data });
    pushLog("→ RN->WV " + payload);
    webviewRef.current?.postMessage(payload);
  }, []);

  const pushLog = useCallback((line: string) => {
    setLogs((prev) =>
      [new Date().toISOString() + " — " + line, ...prev].slice(0, 200)
    );
  }, []);

  const handleStart = useCallback(() => {
    setIsTranscribing(true);
    pushLog("Solicitado START");
    postCommand("startTranscription");
  }, [postCommand, pushLog]);

  const handleStop = useCallback(() => {
    setIsTranscribing(false);
    pushLog("Solicitado STOP");
    postCommand("stopTranscription");
  }, [postCommand, pushLog]);

  // Função para iniciar transcrição via postMessage
  const start = useCallback(() => {
    pushLog("Função start() chamada");
    webviewRef.current?.postMessage(
      JSON.stringify({ type: "startTranscription" })
    );
  }, [pushLog]);

  // Função para parar transcrição via postMessage
  const stop = useCallback(() => {
    pushLog("Função stop() chamada");
    webviewRef.current?.postMessage(
      JSON.stringify({ type: "stopTranscription" })
    );
  }, [pushLog]);

  const handleGetStates = useCallback(() => {
    setLastSyncAt(Date.now());
    pushLog("Solicitada sincronização de estado");
    postCommand("getTranscriptionState");
    postCommand("getRecognizedState");
  }, [postCommand, pushLog]);

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: BridgeMessage | null = null;
      try {
        msg = JSON.parse(event.nativeEvent.data);
      } catch {
        msg = {
          type: "unknown",
          data: event.nativeEvent.data,
        } as BridgeMessage;
      }

      if (msg) {
        pushLog("← WV->RN " + JSON.stringify(msg));
      }

      switch (msg?.type) {
        case "ready":
          setIsReady(true);
          pushLog("WebView sinalizou READY");
          // Opcionalmente, consulta estados iniciais
          handleGetStates();
          break;
        case "transcriptionStarted":
          setIsTranscribing(true);
          pushLog("Transcrição INICIADA");
          break;
        case "recognizing":
          // Parcial ao vivo
          if (msg.data?.transcription != null) {
            setTranscriptionLive(msg.data.transcription);
          }
          setIsTranscribing(!!msg.data?.isTranscribing);
          pushLog("Recognizing parcial atualizado");
          break;
        case "recognized":
          // Resultado confirmado / final — acumula
          if (msg.data?.transcription != null) {
            updateTranscription(msg.data.transcription);
            setTranscriptionLive(""); // limpa parcial
          }
          setIsTranscribing(!!msg.data?.isTranscribing);
          pushLog("Recognized final atualizado");
          break;
        case "transcriptionStopped":
          setIsTranscribing(false);
          // Garante que o final exibido seja o último informado
          if (msg.data?.transcription != null) {
            setTranscriptionFinal(msg.data.transcription);
            setTranscriptionLive("");
          }
          pushLog("Transcrição PARADA");
          break;
        case "transcriptionState":
          if (msg.data?.transcription != null) {
            setTranscriptionLive(msg.data.transcription);
          }
          setIsTranscribing(!!msg.data?.isTranscribing);
          pushLog("Estado sincronizado: " + msg.type);
          break;
        case "recognizedState":
          if (msg.data?.transcription != null) {
            setTranscriptionFinal(msg.data.transcription);
          }
          setIsTranscribing(!!msg.data?.isTranscribing);
          pushLog("Estado sincronizado: " + msg.type);
          break;
        case "error":
          console.warn("WebView error:", msg.data);
          setIsTranscribing(false);
          pushLog("ERRO do WebView: " + JSON.stringify(msg.data));
          break;
        case "transcriptionUpdate":
          console.log("WV transcriptionUpdate:", msg.data);
          if (msg.data?.transcription != null) {
            setTranscriptionUpdate(msg.data.transcription);
            // acrescenta imediatamente como nova linha
            updateTranscription(msg.data.transcription);
          }
          if (typeof msg.data?.isTranscribing === "boolean") {
            setIsTranscribing(msg.data.isTranscribing);
          }
          break;
        default:
          break;
      }
    },
    [handleGetStates, pushLog]
  );

  useEffect(() => {
    const t = setInterval(() => {
      if (transcriptionUpdate) {
        pushLog("Atualização de transcrição recebida: " + transcriptionUpdate);
      }
    }, 2000);
    console.log(transcriptionUpdate);
    return () => clearInterval(t);
  }, [transcriptionUpdate, pushLog]);

  const injectedBefore = useMemo(
    () => `
      (function() {
        // ---- Normalização de mensagens vindas do RN (string -> objeto) ----
        try {
          var __origAddEventListener = window.addEventListener;
          window.addEventListener = function(type, listener, options) {
            if (type === 'message' && typeof listener === 'function') {
              var wrapped = function(e) {
                var data = e && e.data;
                if (typeof data === 'string') {
                  try {
                    var parsed = JSON.parse(data);
                    // cria um "evento-like" com data normalizado
                    var patched = {};
                    for (var k in e) { try { patched[k] = e[k]; } catch(_) {} }
                    patched.data = parsed;
                    try { return listener(patched); } catch(_) { /* fallback abaixo */ }
                  } catch(_) { /* não era JSON, segue */ }
                }
                return listener(e);
              };
              return __origAddEventListener.call(window, type, wrapped, options);
            }
            return __origAddEventListener.call(window, type, listener, options);
          };
        } catch(_) {}
        
        // ---- Encaminhamento de window.parent.postMessage para RN ----
        try {
          var __origParent = window.parent || window;
          var __origParentPost = __origParent.postMessage ? __origParent.postMessage.bind(__origParent) : null;
          __origParent.postMessage = function(data, targetOrigin, transfer) {
            try {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                var payload = (typeof data === 'string') ? data : JSON.stringify(data);
                window.ReactNativeWebView.postMessage(payload);
              }
            } catch(_) {}
            if (__origParentPost) {
              try { __origParentPost(data, targetOrigin, transfer); } catch(_) {}
            }
          };
        } catch(_) {}

        // Sinaliza para a página que está rodando em RN
        try { window.__RUNNING_IN_RN_WEBVIEW__ = true; } catch(e) {}

        // Caso a página escute 'message', garantimos compatibilidade em Android/iOS
        try {
          if (!window.addEventListenerMessagePolyfilled) {
            window.addEventListenerMessagePolyfilled = true;
            document.addEventListener('message', function(e){ 
              // Re-encaminha para listeners de window
              try {
                const evt = new MessageEvent('message', { data: e.data });
                window.dispatchEvent(evt);
              } catch(_) {}
            });
          }
        } catch(_) {}

        // Envia um ping para RN indicando que o documento foi carregado
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready', data: { source: 'injected' } }));
          }
        } catch(_) {}
      })();
    `,
    []
  );

  const injectedAfter = useMemo(
    () => `
      (function() {
        // Bridge robusto pós-carregamento
        try { window.__RUNNING_IN_RN_WEBVIEW__ = true; } catch(e) {}

        function __toRN(payload) {
          try {
            var msg = (typeof payload === 'string') ? payload : JSON.stringify(payload);
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(msg);
              return true;
            }
          } catch(_) {}
          return false;
        }

        // Função global segura para páginas chamarem
        try {
          window.__sendToRN__ = function(type, data) {
            __toRN({ type: type, data: data });
          };
        } catch(_) {}

        // Caso a página use window.parent.postMessage
        try {
          var _p = window.parent || window;
          var _orig = _p.postMessage ? _p.postMessage.bind(_p) : null;
          _p.postMessage = function(data, targetOrigin, transfer) {
            __toRN(data);
            try { if (_orig) { _orig(data, targetOrigin, transfer); } } catch(_) {}
          };
        } catch(_) {}

        // Listener compatível para mensagens vindas do RN
        try {
          if (!window.__addedRNMessageDoc__) {
            window.__addedRNMessageDoc__ = true;
            document.addEventListener('message', function(e){
              try {
                var d = e && e.data;
                var evt = new MessageEvent('message', { data: d });
                window.dispatchEvent(evt);
              } catch(_) {}
            });
          }
        } catch(_) {}

        // Emite READY novamente (pós-carregamento)
        __toRN({ type: 'ready', data: { source: 'injectedAfter' } });
      })();
    `,
    []
  );

  // Ao carregar, podemos consultar o estado inicial
  const onWebViewLoadEnd = useCallback(() => {
    // Aguarda um pouco e consulta estados
    setTimeout(() => {
      handleGetStates();
      setTimeout(() => {
        postCommand("getTranscriptionState");
        postCommand("getRecognizedState");
      }, 800);
    }, 300);
  }, [handleGetStates, postCommand]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ backgroundColor: "#365FD7" }}>
        {/* <Text style={styles.title}>Transcrição (controle local)</Text>

        <View style={styles.row}>
          <Button
            title={isTranscribing ? "Parar" : "Iniciar"}
            onPress={isTranscribing ? handleStop : handleStart}
            disabled={!isReady && !isTranscribing}
          />
          <View style={{ width: 12 }} />
          <Button title="Sincronizar estado" onPress={handleGetStates} />
        </View>

        <Text style={styles.label}>
          Status:{" "}
          <Text style={styles.mono}>
            {isTranscribing ? "Transcrevendo..." : "Parado"}
          </Text>
        </Text>
        <Text style={styles.syncInfo}>
          {lastSyncAt
            ? "Última sincronização: " +
              new Date(lastSyncAt).toLocaleTimeString()
            : "Ainda sem sincronização"}
        </Text>

        <Text style={styles.sectionTitle}>Ao vivo (recognizing)</Text>
        <ScrollView style={styles.box} contentContainerStyle={{ padding: 12 }}>
          <Text style={styles.live}>{transcriptionLive || "—"}</Text>
        </ScrollView>

        <Text style={styles.sectionTitle}>Final (recognized)</Text>
        <ScrollView style={styles.box} contentContainerStyle={{ padding: 12 }}>
          <Text style={styles.final}>{transcriptionFinal || "—"}</Text>
        </ScrollView>

        <Text style={styles.sectionTitle}>Atualização de Transcrição</Text>
        <ScrollView style={styles.box} contentContainerStyle={{ padding: 12 }}>
          <Text style={styles.live}>{transcriptionUpdate || "—"}</Text>
        </ScrollView>

        <Text style={styles.sectionTitle}>Logs</Text>
        <ScrollView
          style={[styles.box, { maxHeight: 140 }]}
          contentContainerStyle={{ padding: 12 }}
        >
          {logs.length === 0 ? (
            <Text style={styles.live}>Sem logs.</Text>
          ) : (
            logs.map((l, i) => (
              <Text key={i} style={styles.logItem}>
                {l}
              </Text>
            ))
          )}
        </ScrollView> */}
        <View style={styles.row}>
          <View
            style={{
              padding: 0,
              margin: 0,
              position: "fixed",
              bottom: 0,
              left: "40%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
            }}
          >
            <TouchableOpacity
              onPress={isTranscribing ? handleStop : handleStart}
              disabled={!isReady && !isTranscribing}
              style={{
                backgroundColor: "#fff",
                borderRadius: "50%",
                width: 70,
                height: 70,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {isTranscribing ? (
                <IconSymbol size={28} name="mic.fill" color={"#365FD7"} />
              ) : (
                <IconSymbol size={28} name="mic" color={"#365FD7"} />
              )}
            </TouchableOpacity>
            {/* <Button
              title={"Update"}
              onPress={() => updateTranscription(transcriptionUpdate)}
            /> */}
            <Text
              style={{
                color: "#fff",
              }}
            >
              {!isTranscribing ? "Iniciar" : "Pausar"}
            </Text>
          </View>
          <View style={{ width: 12 }} />
        </View>
        <WebView
          ref={webviewRef}
          style={{ height: 0, width: 0, opacity: 0 }}
          source={{ uri: "https://sofya-app-controller.netlify.app/" }}
          onMessage={onMessage}
          originWhitelist={["*"]}
          javaScriptEnabled
          injectedJavaScriptBeforeContentLoaded={injectedBefore}
          injectedJavaScript={injectedAfter}
          onLoadEnd={onWebViewLoadEnd}
          onNavigationStateChange={(navState) =>
            pushLog("NAV: " + JSON.stringify({ url: navState.url }))
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#365FD7",
    color: "#ffffff",
    alignContent: "flex-end",
    justifyContent: "flex-end",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#ffffff",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 4,
    fontWeight: "600",
  },
  box: {
    minHeight: 80,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    marginBottom: 12,
  },
  mono: {
    fontFamily: "Courier",
  },
  live: {
    fontSize: 16,
  },
  final: {
    fontSize: 16,
    fontWeight: "500",
  },
  syncInfo: {
    marginBottom: 8,
    fontSize: 12,
    opacity: 0.7,
  },
  logItem: {
    fontSize: 12,
    marginBottom: 4,
  },
});
