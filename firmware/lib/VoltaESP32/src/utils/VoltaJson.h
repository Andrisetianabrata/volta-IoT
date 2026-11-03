#pragma once
#include <Arduino.h>
#include <ArduinoJson.h>

inline size_t makeStatePayload(const char* pin, const char* value, unsigned long ts, char* out,
                               size_t outSize) {
  JsonDocument doc;
  doc["pin"] = pin;
  doc["value"] = value;
  doc["ts"] = ts;
  return serializeJson(doc, out, outSize);
}

inline bool parseCmdValue(const char* payload, char* out, size_t outSize) {
  if (!payload || !out || outSize == 0) return false;
  while (*payload == ' ' || *payload == '\t') ++payload;
  if (*payload == '{') {
    JsonDocument doc;
    if (deserializeJson(doc, payload)) return false;
    const char* v = doc["value"];
    if (!v) return false;
    strncpy(out, v, outSize - 1);
    out[outSize - 1] = '\0';
    return true;
  }
  strncpy(out, payload, outSize - 1);
  out[outSize - 1] = '\0';
  return true;
}
