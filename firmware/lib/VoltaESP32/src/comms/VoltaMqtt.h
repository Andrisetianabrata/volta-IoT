#pragma once
#include <Arduino.h>
#include <PubSubClient.h>

class VoltaMqtt {
 public:
  using Handler = void (*)(const char* topic, const uint8_t* payload, unsigned int length);

  VoltaMqtt(Client& net, const char* broker, uint16_t port = 1883)
      : broker_(broker),
        port_(port),
        handler_(nullptr),
        backoffMs_(2000),
        lastAttempt_(0),
        begun_(false) {
    client_.setClient(net);
  }

  void setIdentity(const char* clientId, const char* user, const char* pass, const char* willTopic,
                   const char* willMessage) {
    clientId_ = clientId;
    user_ = user;
    pass_ = pass;
    willTopic_ = willTopic;
    willMessage_ = willMessage;
  }

  void setHandler(Handler h) { handler_ = h; }

  void begin() {
    client_.setServer(broker_, port_);
    client_.setCallback(trampoline);
    client_.setBufferSize(512);
    client_.setKeepAlive(30);
    client_.setSocketTimeout(3);
    s_instance = this;
    begun_ = true;
    lastAttempt_ = millis() - backoffMs_;
  }

  void update() {
    if (!begun_) return;
    if (!client_.connected()) {
      unsigned long now = millis();
      if (now - lastAttempt_ < backoffMs_) return;
      lastAttempt_ = now;
      if (connectOnce()) {
        backoffMs_ = 2000;
      } else if (backoffMs_ < 30000) {
        backoffMs_ *= 2;
      }
      return;
    }
    client_.loop();
  }

  bool connected() { return client_.connected(); }

  bool publish(const char* topic, const char* payload, bool retained = false) {
    if (!client_.connected()) return false;
    return client_.publish(topic, payload, retained);
  }

  bool subscribe(const char* topic) {
    if (!client_.connected()) return false;
    return client_.subscribe(topic);
  }

 private:
  bool connectOnce() {
    bool ok;
    if (willTopic_) {
      ok = client_.connect(clientId_, user_, pass_, willTopic_, 1, true, willMessage_);
    } else {
      ok = client_.connect(clientId_, user_, pass_);
    }
    return ok;
  }

  static void trampoline(char* topic, uint8_t* payload, unsigned int length) {
    if (s_instance && s_instance->handler_) s_instance->handler_(topic, payload, length);
  }

  static VoltaMqtt* s_instance;

  PubSubClient client_;
  const char* broker_;
  uint16_t port_;
  const char* clientId_ = nullptr;
  const char* user_ = nullptr;
  const char* pass_ = nullptr;
  const char* willTopic_ = nullptr;
  const char* willMessage_ = nullptr;
  Handler handler_;
  unsigned long backoffMs_;
  unsigned long lastAttempt_;
  bool begun_;
};

inline VoltaMqtt* VoltaMqtt::s_instance = nullptr;
