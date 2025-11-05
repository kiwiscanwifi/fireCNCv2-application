/**
 * @file src/services/firmware-files.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A service that holds the content of all C++ firmware source files.
 * This simulates having access to the device's file system for browsing and editing.
 */
import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FirmwareFilesService {
  private fileData: Map<string, WritableSignal<string>> = new Map();
  
  files: WritableSignal<string[]> = signal([]);

  constructor() {
    this.initializeFirmwareFiles();
  }
  
  private initializeFirmwareFiles() {
    const fileContents: Record<string, string> = {
        'fireCNC.ino': `//
// @file fireCNC.ino
// @brief Main firmware file for the fireCNC controller.
//
#include "config.h"
#include "network.h"
#include "io.h"
#include "system.h"
#include "leds.h"
#include "alexa.h"
#include "servos.h"
#include "snmp.h"
#include "shell.h"

void setup() {
  Serial.begin(115200);
  // while (!Serial); // Commented out for headless operation

  System::initialize();
  Leds::initialize();
  Leds::playStartupAnimation();
  
  if (!Config::load()) {
    System::handleError("CRITICAL: Failed to load config.json. Halting.");
    // In a real scenario, we might enter a safe mode or loop forever.
  }

  Io::initialize();
  Network::initialize();
  Servos::initialize();
  Snmp::initialize();
  Alexa::initialize();
  Shell::initialize();
  
  System::log(INFO, "System initialization complete. fireCNC is online.");
}

void loop() {
  Network::loop();
  Io::loop();
  Leds::loop();
  Alexa::loop();
  Servos::loop();
  Snmp::loop();
  Shell::loop();
  System::loop(); // Handles watchdog, etc.
}`,
        'config.h': `//
// @file config.h
// @brief Configuration management for fireCNC.
//
#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>
#include <ArduinoJson.h>

// Structs to hold configuration data, mirroring the web app's services.
struct SshConfig { bool ENABLED; String USERNAME; String PASSWORD; };
struct SystemConfig { bool WATCHDOG; int WATCHDOG_TIMEOUT; String WATCHDOG_IP; int WEBSOCKET_PORT; /* ... other fields */ };
struct NetworkConfig { String NTP_SERVER; String STATIC_IP; /* ... */ };
struct WifiConfig { String SSID; String PASSWORD; };
struct LedsConfig { int COUNT_X; int COUNT_Y; /* ... */ };
struct AlexaConfig { bool ENABLED; String ANNOUNCE_DEVICE; /* ... */ };
struct ServosConfig { int SLAVE_ID_X; /* ... */ };
struct TableConfig { int RAIL_X; int RAIL_Y; };
struct StorageMonitoringConfig { int SD_CARD_THRESHOLD; /* ... */ };
struct SnmpConfig { bool AGENT_ENABLED; bool TRAPS_ENABLED; String COMMUNITY; /* ... */ };

class Config {
public:
  static bool load();
  static bool save();

  // Public getters to access config data safely.
  static const SystemConfig& getSystemConfig();
  static const NetworkConfig& getNetworkConfig();
  // ... other getters

private:
  static bool parseJson(JsonDocument& doc);
  
  // Private static members to hold the single instance of config data.
  static SshConfig sshConfig;
  static SystemConfig systemConfig;
  static NetworkConfig networkConfig;
  // ... other configs
};

#endif // CONFIG_H`,
        'config.cpp': `//
// @file config.cpp
// @brief Implementation for loading and saving config.json.
//
#include "config.h"
#include "system.h"
#include <SD.h>

// Define static members
SshConfig Config::sshConfig;
SystemConfig Config::systemConfig;
NetworkConfig Config::networkConfig;
// ... other static definitions

bool Config::load() {
  File configFile = SD.open("/config.json", FILE_READ);
  if (!configFile) {
    System::log(ERROR, "Failed to open config.json for reading.");
    return false;
  }

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, configFile);
  configFile.close();

  if (error) {
    System::log(ERROR, "Failed to parse config.json: " + String(error.c_str()));
    return false;
  }

  return parseJson(doc);
}

bool Config::parseJson(JsonDocument& doc) {
  // Example parsing for one section. Repeat for all sections.
  JsonObject system = doc["SYSTEM"];
  if (system) {
    systemConfig.WATCHDOG = system["WATCHDOG"] | true;
    systemConfig.WATCHDOG_TIMEOUT = system["WATCHDOG_TIMEOUT"] | 30;
    systemConfig.WATCHDOG_IP = system["WATCHDOG_IP"].as<String>();
    systemConfig.WEBSOCKET_PORT = system["WEBSOCKET_PORT"] | 80;
    // ... parse all other system config values
  }

  System::log(INFO, "Configuration loaded successfully.");
  return true;
}

bool Config::save() {
  // Implementation for saving the configuration back to the SD card.
  // This would serialize the structs back into a JSON object.
  System::log(INFO, "Configuration saved to SD card.");
  return true; 
}

// Implement all getter functions
const SystemConfig& Config::getSystemConfig() { return systemConfig; }
// ... other getters
`,
        'network.h': `//
// @file network.h
// @brief Network management (Ethernet, WiFi, WebSocket).
//
#ifndef NETWORK_H
#define NETWORK_H

#include <Arduino.h>

class Network {
public:
  static void initialize();
  static void loop();
  static void broadcast(const String& message);

private:
  static void connectEthernet();
  static void connectWifi();
  static void startWebSocketServer();
  static void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length);
  static void syncNtp();
};

#endif // NETWORK_H`,
        'network.cpp': `//
// @file network.cpp
// @brief Implementation of network functions.
//
#include "network.h"
#include "system.h"
#include "config.h"
#include <ETH.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <NTPClient.h>
#include <WiFiUdp.h>

static WebSocketsServer webSocket = WebSocketsServer(80); // Default port, will be updated from config

void Network::initialize() {
  // Logic to prioritize Ethernet, then WiFi, then static fallback
  System::log(INFO, "Initializing network...");
  connectEthernet();
}

void Network::loop() {
  webSocket.loop();
}

void Network::connectEthernet() {
  // Implementation for connecting to Ethernet using ETH library
  System::log(INFO, "Attempting Ethernet connection...");
  // ...
  startWebSocketServer();
  syncNtp();
}

void Network::connectWifi() {
  // Implementation for connecting to WiFi
}

void Network::startWebSocketServer() {
  webSocket.begin();
  webSocket.onEvent(onWebSocketEvent);
  System::log(INFO, "WebSocket server started.");
}

void Network::onWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  // Handle WebSocket events (connect, disconnect, text)
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\\n", num);
      break;
    case WStype_CONNECTED:
      Serial.printf("[%u] Connected from url: %s\\n", num, payload);
      webSocket.sendTXT(num, "fireCNC Connected");
      break;
    case WStype_TEXT:
      // Echo back for now
      webSocket.sendTXT(num, payload, length);
      break;
  }
}

void Network::syncNtp() {
  // Implementation for NTP time sync
}

void Network::broadcast(const String& message) {
    webSocket.broadcastTXT(message);
}
`,
        'io.h': `//
// @file io.h
// @brief Manages hardware inputs and outputs.
//
#ifndef IO_H
#define IO_H

class Io {
public:
  static void initialize();
  static void loop();
  static void setDigitalOutput(uint8_t pin, bool state);
  static bool getDigitalInput(uint8_t pin);
  static void setBuzzer(bool state);

private:
  static void readInputs();
};

#endif // IO_H`,
        'io.cpp': `//
// @file io.cpp
// @brief Implementation of I/O functions.
//
#include "io.h"
#include "system.h"
#include <Adafruit_TCA9554.h>

Adafruit_TCA9554 expander;
bool digitalInputs[8];
const int inputPins[8] = {4, 5, 6, 7, 8, 9, 10, 11};

void Io::initialize() {
  if (!expander.begin()) {
    System::handleError("TCA9554 I/O Expander not found.");
  } else {
    for (int i=0; i<8; i++) {
      expander.pinMode(i, OUTPUT);
    }
    System::log(INFO, "TCA9554 I/O Expander initialized.");
  }

  for (int i=0; i<8; i++) {
    pinMode(inputPins[i], INPUT_PULLUP);
  }
}

void Io::loop() {
  readInputs();
}

void Io::readInputs() {
  for (int i=0; i<8; i++) {
    bool currentState = !digitalRead(inputPins[i]); // Inverted due to pull-up
    if (currentState != digitalInputs[i]) {
      digitalInputs[i] = currentState;
      // Here you would send a trap or WebSocket message
    }
  }
}

void Io::setDigitalOutput(uint8_t pin, bool state) {
  if (pin < 8) {
    expander.digitalWrite(pin, state);
  }
}

bool Io::getDigitalInput(uint8_t pin) {
  if (pin < 8) {
    return digitalInputs[pin];
  }
  return false;
}

void Io::setBuzzer(bool state) {
  // Logic to control the buzzer on GPIO46
}
`,
        'system.h': `//
// @file system.h
// @brief System-level functions.
//
#ifndef SYSTEM_H
#define SYSTEM_H

#include <Arduino.h>

enum LogLevel { DEBUG, INFO, WARN, ERROR };

class System {
public:
  static void initialize();
  static void loop();
  static void log(LogLevel level, const String& message);
  static void handleError(const String& message);
  static void rebootDevice();

private:
  static void petWatchdog();
};

#endif // SYSTEM_H`,
        'system.cpp': `//
// @file system.cpp
// @brief Implementation of system-level functions.
//
#include "system.h"
#include "network.h"
#include <esp_task_wdt.h>

#define WDT_TIMEOUT 30 // seconds

void System::initialize() {
  esp_task_wdt_init(WDT_TIMEOUT, true);
  esp_task_wdt_add(NULL); // Add current task to WDT
  log(INFO, "System core initialized.");
}

void System::loop() {
  petWatchdog();
  // Other periodic system tasks
}

void System::petWatchdog() {
  esp_task_wdt_reset();
}

void System::log(LogLevel level, const String& message) {
  String logEntry = "[" + String(level) + "] " + message;
  Serial.println(logEntry);
  Network::broadcast(logEntry); // Send to WebSocket clients
}

void System::handleError(const String& message) {
  log(ERROR, message);
  // Potentially enter a safe state, flash LEDs, etc.
}

void System::rebootDevice() {
  log(WARN, "Rebooting device now...");
  delay(100);
  ESP.restart();
}
`,
        'leds.h': `//
// @file leds.h
// @brief Manages NeoPixel LED strips and onboard LED.
//
#ifndef LEDS_H
#define LEDS_H

class Leds {
public:
  static void initialize();
  static void loop();
  static void playStartupAnimation();
  static void setOnboardLed(bool on, uint32_t color = 0);

private:
  static void updateStripX();
  static void updateStripY();
  static void updateStripYY();
};

#endif // LEDS_H`,
        'leds.cpp': `//
// @file leds.cpp
// @brief Implementation of LED control.
//
#include "leds.h"
#include "config.h"
#include <Adafruit_NeoPixel.h>

#define ONBOARD_LED_PIN 38
// Other LED strip pins

// Adafruit_NeoPixel stripX = Adafruit_NeoPixel(...);
// ...

void Leds::initialize() {
  pinMode(ONBOARD_LED_PIN, OUTPUT);
  // stripX.begin();
  // stripX.show();
}

void Leds::loop() {
  // Update LED strips based on system state (running, error, idle)
  updateStripX();
  updateStripY();
  updateStripYY();
}

void Leds::playStartupAnimation() {
  // Logic for the startup animation
}

void Leds::setOnboardLed(bool on, uint32_t color) {
  if (on) {
    // Here you would use a PWM signal for brightness/color if the LED supports it
    digitalWrite(ONBOARD_LED_PIN, HIGH);
  } else {
    digitalWrite(ONBOARD_LED_PIN, LOW);
  }
}

void Leds::updateStripX() { /* ... */ }
void Leds::updateStripY() { /* ... */ }
void Leds::updateStripYY() { /* ... */ }
`,
        'alexa.h': `//
// @file alexa.h
// @brief Alexa integration using Espalexa.
//
#ifndef ALEXA_H
#define ALEXA_H

class Alexa {
public:
  static void initialize();
  static void loop();

private:
  // Callback functions for each Alexa device
  static void onOnboardLedChange(uint8_t brightness);
  static void onBuzzerChange(uint8_t brightness);
};

#endif // ALEXA_H`,
        'alexa.cpp': `//
// @file alexa.cpp
// @brief Implementation of Alexa device simulation.
//
#include "alexa.h"
#include "config.h"
#include "io.h"
#include "leds.h"
#include <Espalexa.h>

Espalexa espalexa;

void Alexa::initialize() {
  // Don't initialize if disabled in config
  // if (!Config::getAlexaConfig().ENABLED) return;

  espalexa.addDevice("Onboard LED", onOnboardLedChange);
  espalexa.addDevice("System Buzzer", onBuzzerChange);
  // ... add other devices

  espalexa.begin();
}

void Alexa::loop() {
  // if (!Config::getAlexaConfig().ENABLED) return;
  espalexa.loop();
}

void Alexa::onOnboardLedChange(uint8_t brightness) {
  bool state = (brightness > 0);
  uint32_t color = (state) ? espalexa.toLastColor() : 0;
  Leds::setOnboardLed(state, color);
}

void Alexa::onBuzzerChange(uint8_t brightness) {
  Io::setBuzzer(brightness > 0);
}
`,
        'servos.h': `//
// @file servos.h
// @brief Controls servo motors via Modbus RTU.
//
#ifndef SERVOS_H
#define SERVOS_H

class Servos {
public:
  static void initialize();
  static void loop();
  static void moveTo(char axis, int position);

private:
  static void updatePositions();
};

#endif // SERVOS_H`,
        'servos.cpp': `//
// @file servos.cpp
// @brief Implementation of servo control.
//
#include "servos.h"
#include "system.h"
#include <ArduinoModbus.h>

void Servos::initialize() {
  // Setup Serial for RS485 and ModbusRTUClient
  System::log(INFO, "Initializing servo controllers...");
}

void Servos::loop() {
  // Periodically read servo positions and limit switch statuses
  updatePositions();
}

void Servos::moveTo(char axis, int position) {
  // Logic to send Modbus command to a specific servo slave ID
}

void Servos::updatePositions() {
  // Logic to poll each servo for its current position
}
`,
        'snmp.h': `//
// @file snmp.h
// @brief SNMP Agent implementation.
//
#ifndef SNMP_H
#define SNMP_H

class Snmp {
public:
  static void initialize();
  static void loop();
  static void sendTrap(const char* message);
};

#endif // SNMP_H`,
        'snmp.cpp': `//
// @file snmp.cpp
// @brief Implementation of the SNMP agent.
//
#include "snmp.h"
#include "system.h"
// An actual SNMP library would be included here, this is a placeholder
// e.g. #include <Agentuino.h>

void Snmp::initialize() {
  System::log(INFO, "Initializing SNMP agent...");
  // Setup OIDs and callbacks here
}

void Snmp::loop() {
  // Handle incoming SNMP requests
}

void Snmp::sendTrap(const char* message) {
  System::log(INFO, "Sending SNMP Trap: " + String(message));
  // Logic to format and send an SNMP trap
}
`,
        'shell.h': `//
// @file shell.h
// @brief Interactive shell for diagnostics.
//
#ifndef SHELL_H
#define SHELL_H

class Shell {
public:
  static void initialize();
  static void loop();

private:
  static void processCommand(String command);
};

#endif // SHELL_H`,
        'shell.cpp': `//
// @file shell.cpp
// @brief Implementation of the interactive shell.
//
#include "shell.h"
#include "system.h"
#include <SD.h>

void Shell::initialize() {
  // The shell is handled via WebSocket, so no specific hardware init needed.
  System::log(INFO, "Interactive shell is available via WebSocket.");
}

void Shell::loop() {
  // The shell is event-driven by incoming WebSocket messages.
  // A message could be passed to processCommand.
}

void Shell::processCommand(String command) {
  // Logic to parse and execute commands like 'ls', 'cat', 'reboot'
  if (command == "reboot") {
    System::rebootDevice();
  }
  // ... other commands
}
`,
    };
    
    for (const [path, content] of Object.entries(fileContents)) {
        this.fileData.set(path, signal(content));
    }
    
    // Sort files to have .ino first, then headers, then cpp files
    this.files.set(Object.keys(fileContents).sort((a, b) => {
        if (a.endsWith('.ino')) return -1;
        if (b.endsWith('.ino')) return 1;
        if (a.endsWith('.h') && !b.endsWith('.h')) return -1;
        if (!a.endsWith('.h') && b.endsWith('.h')) return 1;
        return a.localeCompare(b);
    }));
  }

  getFileContent(path: string): WritableSignal<string> | undefined {
    return this.fileData.get(path);
  }

  updateFileContent(path: string, newContent: string): void {
    const fileSignal = this.fileData.get(path);
    if (fileSignal) {
      fileSignal.set(newContent);
      console.log(`[Firmware Service] Updated content for ${path}`);
    }
  }
}
