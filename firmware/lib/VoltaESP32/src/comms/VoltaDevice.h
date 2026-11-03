#pragma once
#include <Arduino.h>
#include <WiFi.h>

#include "comms/VoltaMqtt.h"
#include "utils/VoltaJson.h"

class VoltaDevice {
 public:
  using CommandHandler = void (*)(const char* pin, const char* value);

  VoltaDevice(const char* deviceId, const char* token, const char* broker, uint16_t port = 1883)
      : id_(deviceId), token_(token), mqtt_(wifi_, broker, port), handler_(nullptr) {
    snprintf(statusTopic_, sizeof(statusTopic_), "volta/dev/%s/status", id_);
    snprintf(cmdTopic_, sizeof(cmdTopic_), "volta/dev/%s/cmd/+", id_);
    snprintf(logTopic_, sizeof(logTopic_), "volta/dev/%s/log", id_);
  }

  void setWifi(const char* ssid, const char* pass) {
    ssid_ = ssid;
    pass_ = pass;
  }

  void onCommand(CommandHandler h) { handler_ = h; }
  void setBroker(const char* host, uint16_t port = 1883) { mqtt_.setServer(host, port); }

  void begin() {
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    WiFi.begin(ssid_, pass_);
    mqtt_.setIdentity(id_, token_, token_, statusTopic_, "offline");
    mqtt_.setHandler(onMqttStatic);
    s_instance = this;
    mqtt_.begin();
    lastStatus_ = WiFi.status();
    lastChange_ = millis();
  }

  void update() {
    unsigned long now = millis();
    wl_status_t st = WiFi.status();
    if (st != WL_CONNECTED) {
      if (st != lastStatus_) {
        lastStatus_ = st;
        lastChange_ = now;
      } else if (now - lastChange_ > 20000UL) {
        WiFi.disconnect();
        WiFi.begin(ssid_, pass_);
        lastChange_ = now;
      }
      return;
    }
    lastStatus_ = st;
    lastChange_ = now;
    bool was = mqtt_.connected();
    mqtt_.update();
    if (!was && mqtt_.connected()) {
      mqtt_.publish(statusTopic_, "online", true);
      mqtt_.subscribe(cmdTopic_);
    }
  }

  bool online() const { return WiFi.status() == WL_CONNECTED; }
  bool mqttConnected() { return mqtt_.connected(); }
  long rssi() { return WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0; }

  static const char* wifiStatusText() {
    switch (WiFi.status()) {
      case WL_IDLE_STATUS: return "IDLE";
      case WL_NO_SSID_AVAIL: return "NO_SSID";
      case WL_SCAN_COMPLETED: return "SCAN_DONE";
      case WL_CONNECTED: return "CONNECTED";
      case WL_CONNECT_FAILED: return "CONNECT_FAILED";
      case WL_CONNECTION_LOST: return "LOST";
      case WL_DISCONNECTED: return "DISCONNECTED";
      default: return "?";
    }
  }

  bool publishState(const char* pin, const char* value) {
    char topic[64];
    snprintf(topic, sizeof(topic), "volta/dev/%s/state/%s", id_, pin);
    return mqtt_.publish(topic, value, true);
  }

  bool publishState(const char* pin, float value, int prec = 2) {
    char buf[32];
    snprintf(buf, sizeof(buf), "%.*f", prec, (double)value);
    return publishState(pin, buf);
  }

  bool publishLog(const char* msg) { return mqtt_.publish(logTopic_, msg, false); }

  const char* deviceId() const { return id_; }

 private:
  static void onMqttStatic(const char* topic, const uint8_t* payload, unsigned int length) {
    if (s_instance) s_instance->onMqtt(topic, payload, length);
  }

  void onMqtt(const char* topic, const uint8_t* payload, unsigned int length) {
    char value[96];
    unsigned int n = length < sizeof(value) - 1 ? length : sizeof(value) - 1;
    memcpy(value, payload, n);
    value[n] = '\0';
    if (!parseCmdValue(value, value, sizeof(value))) return;
    const char* pin = topic;
    const char* last = topic;
    for (const char* p = topic; *p; ++p) {
      if (*p == '/') last = p + 1;
    }
    pin = last;
    if (handler_) handler_(pin, value);
  }

  static VoltaDevice* s_instance;

  const char* id_;
  const char* token_;
  const char* ssid_ = nullptr;
  const char* pass_ = nullptr;
  WiFiClient wifi_;
  VoltaMqtt mqtt_;
  CommandHandler handler_;
  char statusTopic_[64];
  char cmdTopic_[64];
  char logTopic_[64];
  wl_status_t lastStatus_ = WL_IDLE_STATUS;
  unsigned long lastChange_ = 0;
};

inline VoltaDevice* VoltaDevice::s_instance = nullptr;
