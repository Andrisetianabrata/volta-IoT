#pragma once
#include <Arduino.h>
#include <Preferences.h>

class VoltaWifiConfig {
 public:
  void begin() {
    stored_ = false;
    if (!prefs_.begin("volta", true)) return;
    String s = prefs_.getString("ssid", "");
    String p = prefs_.getString("pass", "");
    mqtt_ = prefs_.getString("mqtt", "");
    prefs_.end();
    if (s.length() == 0) {
      stored_ = false;
    } else {
      ssid_ = s;
      pass_ = p;
      stored_ = true;
    }
  }

  const char* ssid() const { return stored_ ? ssid_.c_str() : nullptr; }
  const char* pass() const { return stored_ ? pass_.c_str() : nullptr; }
  const char* mqtt() const { return mqtt_.length() > 0 ? mqtt_.c_str() : nullptr; }
  bool fromStorage() const { return stored_; }

  bool pollSerial() {
    while (Serial.available()) {
      char c = (char)Serial.read();
      if (c == '\n' || c == '\r') {
        if (line_.length() > 0) {
          bool r = handle(line_);
          line_ = "";
          if (r) return true;
        }
      } else if (line_.length() < 120) {
        line_ += c;
      }
    }
    return false;
  }

 private:
  bool handle(const String& line) {
    if (line.startsWith("WIFI ")) {
      String rest = line.substring(5);
      rest.trim();
      int sp = rest.indexOf(' ');
      String s, p;
      if (sp < 0) {
        s = rest;
        p = "";
      } else {
        s = rest.substring(0, sp);
        p = rest.substring(sp + 1);
        p.trim();
      }
      if (s.length() == 0) {
        Serial.println(F("pakai: WIFI <ssid> [password]"));
        return false;
      }
      if (!prefs_.begin("volta", false)) {
        Serial.println(F("gagal buka penyimpanan"));
        return false;
      }
      prefs_.putString("ssid", s);
      prefs_.putString("pass", p);
      prefs_.end();
      ssid_ = s;
      pass_ = p;
      stored_ = true;
      Serial.println(F("tersimpan, restart..."));
      return true;
    }
    if (line.startsWith("MQTT ")) {
      String h = line.substring(5);
      h.trim();
      if (h.length() == 0 || h.indexOf(' ') >= 0) {
        Serial.println(F("pakai: MQTT <host-ir-ip-tanpa-spasi>"));
        return false;
      }
      if (!prefs_.begin("volta", false)) {
        Serial.println(F("gagal buka penyimpanan"));
        return false;
      }
      prefs_.putString("mqtt", h);
      prefs_.end();
      mqtt_ = h;
      Serial.println(F("tersimpan, restart..."));
      return true;
    }
    if (line == "SHOW") {
      Serial.print(F("ssid="));
      if (stored_) {
        Serial.println(ssid_);
      } else {
        Serial.println(F("(bawaan)"));
      }
      Serial.print(F("len="));
      Serial.print(stored_ ? (int)pass_.length() : -1);
      Serial.print(F(" sum=0x"));
      unsigned sum = 0;
      for (size_t i = 0; i < pass_.length(); i++) sum += (unsigned char)pass_[i];
      Serial.println(sum, HEX);
      Serial.print(F("mqtt="));
      if (mqtt_.length() > 0) {
        Serial.println(mqtt_);
      } else {
        Serial.println(F("(bawaan)"));
      }
      return false;
    }
    if (line == "FORGET") {
      if (prefs_.begin("volta", false)) {
        prefs_.remove("ssid");
        prefs_.remove("pass");
        prefs_.end();
      }
      stored_ = false;
      Serial.println(F("terhapus, kembali ke bawaan. restart..."));
      return true;
    }
    Serial.println(F("perintah: WIFI <ssid> [password] | MQTT <host> | SHOW | FORGET"));
    return false;
  }

  Preferences prefs_;
  String ssid_;
  String pass_;
  String mqtt_;
  String line_;
  bool stored_ = false;
};
