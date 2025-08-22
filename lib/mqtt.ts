import mqtt, { MqttClient } from 'mqtt';

let mqttClient: MqttClient | null = null;
let mqttClientRefCount = 0;

export function getMqttClient() {
  if (mqttClient && mqttClient.connected) {
    mqttClientRefCount++;
    return mqttClient;
  }
  if (!mqttClient || mqttClient.disconnected) {
    mqttClient = mqtt.connect(String(process.env.EXPO_PUBLIC_MQTT_URL), {
      username: String(process.env.EXPO_PUBLIC_MQTT_USERNAME),
      password: String(process.env.EXPO_PUBLIC_MQTT_PASSWORD),
    });
    mqttClientRefCount = 1;
  }
  return mqttClient;
}

export function releaseMqttClient() {
  if (mqttClientRefCount > 0) {
    mqttClientRefCount--;
    if (mqttClientRefCount === 0 && mqttClient) {
      mqttClient.end();
      mqttClient = null;
    }
  }
}
