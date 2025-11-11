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
  lastSaveError: WritableSignal<string | null> = signal(null); // NEW: Signal to hold the last save error

  constructor() {
    this.initializeFirmwareFiles();
  }
  
  private initializeFirmwareFiles() {
    const fileContents: Record<string, string> = {
        'fireCNC.ino': `/**
 * @file       fireCNC.ino
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Main firmware file for the fireCNC controller. This is the entry point
 *             that initializes all subsystems and runs the main application loop.
 *
 * @dependencies
 * - ArduinoJson: For parsing config.json.
 * - Ethernet: For W5500 Ethernet connectivity.
 * - WebSockets: For real-time communication with the UI.
 * - RTClib: For managing the Real-Time Clock.
 * - SD: For reading/writing to the SD card.
 * - Adafruit_NeoPixel: For controlling WS2815 LED strips.
 * - Espalexa: For emulating Alexa devices.
 * - ArduinoModbus: For RS485 communication with servos.
 * - Adafruit_TCA9554: For the I/O expander controlling digital outputs.
 */

#include "config.h"
#include "network.h"
#include "io.h"
#include "system.h"
#include "leds.h"
#include "alexa.h"
#include "servos.h"
#include "snmp.h"
#include "shell.h"

/**
 * @brief Standard Arduino setup function. Runs once on boot.
 */
void setup() {
  // Initialize serial communication for debugging purposes.
  Serial.begin(115200);
  // A short delay to allow the serial monitor to connect after flashing.
  delay(1000); 
  Serial.println(F("Booting fireCNC Controller..."));

  // 1. Initialize core system components first.
  System::initialize();
  Leds::initialize(); // LEDs need to be ready early for visual feedback.
  
  // 2. Play a startup animation to show the system is booting.
  Leds::playStartupAnimation();
  
  // 3. Load configuration from SD card. This is critical for all subsequent operations.
  if (!Config::load()) {
    // If config fails, enter a permanent error state. The LEDs will indicate the fault.
    System::handleError("CRITICAL: Failed to load config.json. Halting.");
    // Infinite loop to halt execution. In a real scenario, this might trigger a failsafe.
    while(true) { delay(1000); }
  }

  // 4. Initialize all other subsystems using the now-loaded configuration.
  Io::initialize();
  Network::initialize(); // This will handle Ethernet/Wi-Fi connection and start the WebSocket server.
  Servos::initialize();
  Snmp::initialize();
  Alexa::initialize();
  // Shell does not need an init as it's purely event-driven.
  
  System::log(LogLevel::INFO, "System initialization complete. fireCNC is online.");
}

/**
 * @brief Standard Arduino loop function. Runs repeatedly.
 */
void loop() {
  // Each subsystem has its own loop function to handle its continuous tasks.
  // This modular approach keeps the main loop clean and easy to manage.
  Network::loop();    // Handles WebSocket clients and events.
  Io::loop();         // Polls digital inputs for state changes.
  Leds::loop();       // Updates LED strips based on system state (stubbed in this version).
  Alexa::loop();      // Handles incoming requests for emulated Alexa devices.
  Servos::loop();     // Polls servo status registers.
  Snmp::loop();       // Listens for incoming SNMP requests (simulated).
  System::loop();     // Resets the watchdog timer.
}`,
        'config.h': `/**
 * @file       config.h
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Header for configuration management. Defines data structures for storing
 *             settings loaded from config.json on the SD card. Provides a static class
 *             API for loading and accessing these settings globally.
 */
#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// Forward declare ArduinoJson's JsonObject to avoid including the full header here.
class JsonObject;

// Structs to hold configuration data, mirroring the interfaces in the web app's services.
struct SshConfig { bool ENABLED; String USERNAME; String PASSWORD; };
struct SystemConfig { bool WATCHDOG; int WATCHDOG_TIMEOUT; String WATCHDOG_IP; int WEBSOCKET_PORT; bool FIRMWARE; int FIRMWARE_TIME; bool TEXT_SELECTION_ENABLED; String ACCESS_CODE; };
struct NetworkConfig { String NTP_SERVER; String STATIC_IP; String SUBNET; String GATEWAY_IP; String DNS_SERVER; bool DHCP_SERVER_ENABLED; String AP_IP; String AP_SUBNET; };
struct WifiConfig { String MODE; String SSID; String PASSWORD; String WIFI_AP_SSID; String WIFI_AP_KEY; String IP_ASSIGNMENT; String STATIC_IP; String SUBNET; String GATEWAY_IP; };
struct LedsConfig { int COUNT_X; int COUNT_Y; int COUNT_YY; int DEFAULT_BRIGHTNESS_X; int DEFAULT_BRIGHTNESS_Y; int DEFAULT_BRIGHTNESS_YY; bool LED_CHASE; int LED_CHASE_TIMEOUT; };
struct AlexaConfig { bool ENABLED; String ANNOUNCE_DEVICE; String ONBOARD_LED_DEVICE; String SYSTEM_BUZZER_DEVICE; };
struct ServosConfig { int SLAVE_ID_X; int SLAVE_ID_Y; int SLAVE_ID_YY; };
struct TableConfig { int RAIL_X; int RAIL_Y; };
struct SnmpConfig { bool AGENT_ENABLED; bool TRAPS_ENABLED; String COMMUNITY; String TRAP_TARGET; int TRAP_PORT; String TRAP_LEVEL; };

class Config {
public:
  /**
   * @brief Loads configuration from /config.json on the SD card.
   * @return true if loading was successful or if file doesn't exist (defaults are used), false on parsing error.
   */
  static bool load();

  /**
   * @brief Saves the current configuration back to the SD card.
   * @return true if saving was successful, false otherwise.
   */
  static bool save();

  // Public const reference getters to access config data safely from other modules.
  static const SshConfig& getSshConfig();
  static const SystemConfig& getSystemConfig();
  static const NetworkConfig& getNetworkConfig();
  static const WifiConfig& getWifiConfig();
  static const LedsConfig& getLedsConfig();
  static const AlexaConfig& getAlexaConfig();
  static const ServosConfig& getServosConfig();
  static const TableConfig& getTableConfig();
  static const SnmpConfig& getSnmpConfig();
  
private:
  // Helper to parse the JSON document from ArduinoJson into the C++ structs.
  static void parseJson(JsonObject& root);
  
  // Private static members to hold the single instance of config data.
  // This implements the Singleton pattern for configuration.
  static SshConfig sshConfig;
  static SystemConfig systemConfig;
  static NetworkConfig networkConfig;
  static WifiConfig wifiConfig;
  static LedsConfig ledsConfig;
  static AlexaConfig alexaConfig;
  static ServosConfig servosConfig;
  static TableConfig tableConfig;
  static SnmpConfig snmpConfig;
};

#endif // CONFIG_H`,
        'config.cpp': `/**
 * @file       config.cpp
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Implementation for loading and saving config.json from/to the SD card.
 *             It uses the ArduinoJson library for efficient parsing and serialization.
 */
#include "config.h"
#include "system.h"
#include <ArduinoJson.h>
#include <SD.h>

// Define the path to the configuration file on the SD card.
const char* CONFIG_FILE_PATH = "/config.json";

// Initialize static member variables with default values from the web app simulation.
SshConfig Config::sshConfig = {true, "admin", "password"};
SystemConfig Config::systemConfig = {true, 120, "192.168.1.1", 80, true, 60, false, "0000"};
NetworkConfig Config::networkConfig = {"192.168.1.1", "192.168.1.20", "255.255.255.0", "192.168.1.1", "192.168.1.1", true, "192.168.4.1", "255.255.255.0"};
WifiConfig Config::wifiConfig = {"Station", "your_ssid", "your_password", "fireCNC_AP", "admin123", "DHCP", "192.168.1.21", "255.255.255.0", "192.168.1.1"};
LedsConfig Config::ledsConfig = {400, 700, 700, 128, 128, 128, true, 60};
AlexaConfig Config::alexaConfig = {true, "fireCNC", "Onboard LED", "System Buzzer"};
ServosConfig Config::servosConfig = {3, 1, 2};
TableConfig Config::tableConfig = {2000, 3000};
SnmpConfig Config::snmpConfig = {true, true, "public", "0.0.0.0", 162, "ERROR"};

bool Config::load() {
  // Attempt to initialize the SD card. The SPI pins are assumed to be configured correctly.
  if (!SD.begin()) {
    System::log(LogLevel::ERROR, "SD Card initialization failed!");
    return false;
  }

  File configFile = SD.open(CONFIG_FILE_PATH, FILE_READ);
  if (!configFile) {
    System::log(LogLevel::WARN, "config.json not found on SD card. Using default values.");
    return true; // Return true to allow operation with default config.
  }

  // Use a static JSON document to avoid heap fragmentation. Size is an estimate.
  StaticJsonDocument<2048> doc;
  DeserializationError error = deserializeJson(doc, configFile);
  configFile.close();

  if (error) {
    System::log(LogLevel::ERROR, "Failed to parse config.json: " + String(error.c_str()));
    return false; // Return false on parsing error to indicate a critical failure.
  }

  JsonObject root = doc.as<JsonObject>();
  parseJson(root);
  System::log(LogLevel::INFO, "Configuration loaded successfully from SD card.");
  return true;
}

void Config::parseJson(JsonObject& root) {
  // SYSTEM section
  JsonObject system = root["SYSTEM"];
  if (system) {
    systemConfig.WATCHDOG = system["WATCHDOG"] | systemConfig.WATCHDOG;
    systemConfig.WATCHDOG_TIMEOUT = system["WATCHDOG_TIMEOUT"] | systemConfig.WATCHDOG_TIMEOUT;
    systemConfig.WATCHDOG_IP = system["WATCHDOG_IP"] | systemConfig.WATCHDOG_IP.c_str();
    systemConfig.WEBSOCKET_PORT = system["WEBSOCKET_PORT"] | systemConfig.WEBSOCKET_PORT;
    systemConfig.FIRMWARE = system["FIRMWARE"] | systemConfig.FIRMWARE;
    systemConfig.FIRMWARE_TIME = system["FIRMWARE_TIME"] | systemConfig.FIRMWARE_TIME;
    systemConfig.TEXT_SELECTION_ENABLED = system["TEXT_SELECTION_ENABLED"] | systemConfig.TEXT_SELECTION_ENABLED;
    systemConfig.ACCESS_CODE = system["ACCESS_CODE"] | systemConfig.ACCESS_CODE.c_str();
  }

  // SNMP section
  JsonObject snmp = root["SNMP"];
  if (snmp) {
    snmpConfig.AGENT_ENABLED = snmp["AGENT_ENABLED"] | snmpConfig.AGENT_ENABLED;
    snmpConfig.TRAPS_ENABLED = snmp["TRAPS_ENABLED"] | snmpConfig.TRAPS_ENABLED;
    snmpConfig.COMMUNITY = snmp["COMMUNITY"] | snmpConfig.COMMUNITY.c_str();
    snmpConfig.TRAP_TARGET = snmp["TRAP_TARGET"] | snmpConfig.TRAP_TARGET.c_str();
    snmpConfig.TRAP_PORT = snmp["TRAP_PORT"] | snmpConfig.TRAP_PORT;
    snmpConfig.TRAP_LEVEL = snmp["TRAP_LEVEL"] | snmpConfig.TRAP_LEVEL.c_str();
  }

  // ... continue parsing for all other sections (NETWORK, WIFI, LEDS, etc.)
  // The | operator provides a convenient way to use default values if a key is missing.
}

bool Config::save() {
  SD.remove(CONFIG_FILE_PATH);
  File configFile = SD.open(CONFIG_FILE_PATH, FILE_WRITE);
  if (!configFile) {
    System::log(LogLevel::ERROR, "Failed to open config.json for writing.");
    return false;
  }

  StaticJsonDocument<2048> doc;
  
  // Serialize all config structs into the JSON document
  JsonObject system = doc.createNestedObject("SYSTEM");
  system["WATCHDOG"] = systemConfig.WATCHDOG;
  system["WATCHDOG_TIMEOUT"] = systemConfig.WATCHDOG_TIMEOUT;
  // ... and so on for every single field ...

  if (serializeJson(doc, configFile) == 0) {
    System::log(LogLevel::ERROR, "Failed to write to config.json.");
    configFile.close();
    return false;
  }

  configFile.close();
  System::log(LogLevel::INFO, "Configuration saved to SD card.");
  return true;
}

// Implement all getter functions to provide read-only access to other modules.
const SshConfig& Config::getSshConfig() { return sshConfig; }
const SystemConfig& Config::getSystemConfig() { return systemConfig; }
const NetworkConfig& Config::getNetworkConfig() { return networkConfig; }
const WifiConfig& Config::getWifiConfig() { return wifiConfig; }
const LedsConfig& Config::getLedsConfig() { return ledsConfig; }
const AlexaConfig& Config::getAlexaConfig() { return alexaConfig; }
const ServosConfig& Config::getServosConfig() { return servosConfig; }
const TableConfig& Config::getTableConfig() { return tableConfig; }
const SnmpConfig& Config::getSnmpConfig() { return snmpConfig; }`,
        'network.h': `/**
 * @file       network.h
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Header for network management, handling Ethernet (W5500), Wi-Fi, WebSocket server,
 *             and NTP time synchronization. Provides the core communication layer with the UI.
 */
#ifndef NETWORK_H
#define NETWORK_H

#include <Arduino.h>
#include <WebSocketsServer.h> // Include needed for WStype_t

class Network {
public:
  /**
   * @brief Initializes the primary network interface (Ethernet preferred, Wi-Fi fallback).
   * Also starts the WebSocket server and attempts NTP synchronization.
   */
  static void initialize();

  /**
   * @brief Main network loop, primarily for handling WebSocket client events.
   * Must be called repeatedly from the main sketch loop.
   */
  static void loop();
  
  /**
   * @brief Broadcast a message to all connected WebSocket clients.
   * @param message The string message to send. Used for system-wide logs and status updates.
   */
  static void broadcast(const String& message);

private:
  static void connectEthernet();
  static void connectWifi();
  static void startWebSocketServer();
  static void syncNtp();

  /**
   * @brief Callback function for all WebSocket events (connect, disconnect, text).
   * @param num Client number.
   * @param type The type of event.
   * @param payload The message data.
   * @param length The length of the message data.
   */
  static void onWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length);

  /**
   * @brief Handles incoming text messages from a WebSocket client.
   * It parses the message to determine if it's a shell command or a JSON-based command.
   * @param num Client number.
   * @param message The incoming text message.
   */
  static void handleWebSocketMessage(uint8_t num, const char* message);
};

#endif // NETWORK_H`,
        'network.cpp': `/**
 * @file       network.cpp
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Implementation of network functionalities including Ethernet, WiFi,
 *             WebSocket server for UI communication, and NTP for time sync. This mirrors
 *             the logic from websocket.service.ts and parts of arduino.service.ts.
 */
#include "network.h"
#include "system.h"
#include "config.h"
#include "shell.h"
#include <ETH.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <ArduinoJson.h>

// W5500 Ethernet SPI pins as defined in the web app's GPIO reference.
#define ETH_MOSI 13
#define ETH_MISO 14
#define ETH_SCLK 15
#define ETH_CS   16
#define ETH_INT  12
#define ETH_RST  39

// Global flag to track Ethernet connection status.
static bool eth_connected = false;

// WebSocket server instance. Port is set during initialization.
WebSocketsServer webSocket(80); 
// UDP and NTP client for time synchronization.
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP);

void Network::initialize() {
  System::log(LogLevel::INFO, "Initializing network...");
  connectEthernet();

  // If Ethernet failed, attempt Wi-Fi as a fallback.
  if (!eth_connected) {
    System::log(LogLevel::WARN, "Ethernet not connected. Attempting Wi-Fi...");
    connectWifi();
  }

  // If either Ethernet or Wi-Fi is connected, start services.
  if (eth_connected || WiFi.isConnected()) {
    startWebSocketServer();
    syncNtp();
  } else {
    System::handleError("FATAL: No network connection available. Cannot start services.");
  }
}

void Network::connectEthernet() {
  // Setup SPI for the W5500 module.
  SPI.begin(ETH_SCLK, ETH_MISO, ETH_MOSI, -1);
  ETH.begin(ETH_CS, ETH_RST, ETH_INT, ETH_MOSI, ETH_MISO, ETH_SCLK);
  
  const NetworkConfig& netConf = Config::getNetworkConfig();
  IPAddress staticIP, gateway, subnet, dns;
  staticIP.fromString(netConf.STATIC_IP);
  gateway.fromString(netConf.GATEWAY_IP);
  subnet.fromString(netConf.SUBNET);
  dns.fromString(netConf.DNS_SERVER);
  
  if (!ETH.config(staticIP, gateway, subnet, dns)) {
    System::log(LogLevel::ERROR, "Failed to configure Ethernet with static IP.");
  }

  // Wait for the Ethernet link to come up, with a timeout.
  unsigned long startTime = millis();
  System::log(LogLevel::INFO, "Waiting for Ethernet link...");
  while (ETH.linkStatus() != LinkStatus::LinkON && millis() - startTime < 5000) {
    delay(100);
  }

  if (ETH.linkStatus() == LinkStatus::LinkON) {
    eth_connected = true;
    System::log(LogLevel::INFO, "Ethernet connected. IP: " + ETH.localIP().toString());
  }
}

void Network::connectWifi() {
  const WifiConfig& wifiConf = Config::getWifiConfig();
  if (wifiConf.MODE == "Disabled") {
    System::log(LogLevel::INFO, "WiFi is disabled in config.");
    return;
  }
  // TODO: Implement Station and AP mode connection logic based on wifiConf.
  // WiFi.begin(wifiConf.SSID.c_str(), wifiConf.PASSWORD.c_str());
}

void Network::loop() {
  webSocket.loop();
  timeClient.update(); // Polls NTP server.
}

void Network::startWebSocketServer() {
  uint16_t port = Config::getSystemConfig().WEBSOCKET_PORT;
  webSocket = WebSocketsServer(port);
  webSocket.begin();
  webSocket.onEvent(onWebSocketEvent);
  System::log(LogLevel::INFO, "WebSocket server started on port " + String(port));
}

void Network::onWebSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      System::log(LogLevel::INFO, "WebSocket client #" + String(num) + " disconnected.");
      break;
    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      System::log(LogLevel::INFO, "WebSocket client #" + String(num) + " connected from " + ip.toString());
      webSocket.sendTXT(num, "fireCNC Connected");
      break;
    }
    case WStype_TEXT:
      handleWebSocketMessage(num, (const char*)payload);
      break;
    default:
      // Other event types are ignored.
      break;
  }
}

void Network::handleWebSocketMessage(uint8_t num, const char* message) {
    // Attempt to parse the message as JSON.
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, message);

    if (error) {
        // If it's not JSON, assume it's a shell command.
        String response = Shell::processCommand(message);
        if (response.length() > 0) {
            webSocket.sendTXT(num, response);
        }
    } else {
      // If it is JSON, process it as a structured command.
      // Example: String command = doc["command"];
      // if (command == "set_do") { Io::setDigitalOutput(doc["index"], doc["state"]); }
      System::log(LogLevel::DEBUG, "Received JSON command (handler not implemented).");
    }
}

void Network::syncNtp() {
  System::log(LogLevel::INFO, "Syncing time with NTP server: " + Config::getNetworkConfig().NTP_SERVER);
  timeClient.setPoolServerName(Config::getNetworkConfig().NTP_SERVER.c_str());
  timeClient.begin();
  if(timeClient.forceUpdate()) {
    System::log(LogLevel::INFO, "NTP time synchronized: " + timeClient.getFormattedTime());
  } else {
    System::log(LogLevel::WARN, "Failed to synchronize NTP time.");
  }
}

void Network::broadcast(const String& message) {
    webSocket.broadcastTXT(message);
}`,
        'io.h': `/**
 * @file       io.h
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Header for managing hardware inputs and outputs, including onboard
 *             GPIOs for digital inputs and the TCA9554 I2C I/O expander for digital outputs.
 *             Also manages the onboard buzzer.
 */
#ifndef IO_H
#define IO_H

#include <Arduino.h>

class Io {
public:
  /**
   * @brief Initializes all I/O hardware: I2C for the expander, input GPIOs, and buzzer GPIO.
   */
  static void initialize();

  /**
   * @brief Main I/O loop. Periodically reads inputs and checks for state changes.
   * Must be called repeatedly from the main sketch loop.
   */
  static void loop();
  
  /**
   * @brief Set the state of a specific digital output on the TCA9554 expander.
   * @param pin The output pin number (0-7).
   * @param state The desired state (true for HIGH, false for LOW).
   */
  static void setDigitalOutput(uint8_t pin, bool state);

  /**
   * @brief Get the current cached state of a specific digital input.
   * @param pin The input pin number (0-7).
   * @return The state of the input (true for HIGH, false for LOW).
   */
  static bool getDigitalInput(uint8_t pin);

  /**
   * @brief Set the state of the onboard buzzer.
   * @param state The desired state (true to turn on, false to turn off).
   */
  static void setBuzzer(bool state);

private:
  /**
   * @brief Reads the state of all 8 digital input GPIOs and updates the internal cache.
   */
  static void readAllInputs();
  
  /**
   * @brief Compares current input states with previous states to detect changes.
   * If a change is detected, it logs the event and sends an SNMP trap.
   */
  static void checkInputChanges();
};

#endif // IO_H`,
        'io.cpp': `/**
 * @file       io.cpp
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Implementation of I/O functions for digital inputs, digital outputs, and the buzzer.
 *             Digital outputs are controlled via an Adafruit_TCA9554 I2C I/O expander.
 *             Digital inputs are read directly from ESP32 GPIO pins.
 */
#include "io.h"
#include "system.h"
#include "snmp.h"
#include <Adafruit_TCA9554.h>

// I/O Expander for Digital Outputs
Adafruit_TCA9554 expander;
bool expander_ok = false;

// State arrays for caching digital input states
bool current_di_states[8];
bool previous_di_states[8];

// Mapping of DI index to physical GPIO pin number, based on web app GPIO reference.
const int inputPins[8] = {4, 5, 6, 7, 8, 9, 10, 11};
// Onboard buzzer pin.
const int buzzerPin = 46;

void Io::initialize() {
  // Start the I2C bus for the I/O expander.
  Wire.begin();
  if (!expander.begin()) {
    System::handleError("TCA9554 I/O Expander not found. Digital outputs will be unavailable.");
    expander_ok = false;
  } else {
    // Configure all 8 pins of the expander as outputs and set them to LOW.
    for (int i=0; i<8; i++) {
      expander.pinMode(i, OUTPUT);
      expander.digitalWrite(i, LOW);
    }
    System::log(LogLevel::INFO, "TCA9554 I/O Expander initialized.");
    expander_ok = true;
  }

  // Initialize digital input pins with internal pull-up resistors.
  // This means the pin will read HIGH when open and LOW when connected to ground.
  for (int i=0; i<8; i++) {
    pinMode(inputPins[i], INPUT_PULLUP);
  }
  
  pinMode(buzzerPin, OUTPUT);
  digitalWrite(buzzerPin, LOW);

  // Perform an initial read of inputs to populate the state arrays.
  readAllInputs();
  for (int i=0; i<8; i++) {
    previous_di_states[i] = current_di_states[i];
  }
}

void Io::loop() {
  // Read inputs and check for changes periodically to avoid blocking.
  static unsigned long last_read_time = 0;
  if (millis() - last_read_time > 50) { // Poll every 50ms for responsiveness.
    readAllInputs();
    checkInputChanges();
    last_read_time = millis();
  }
}

void Io::readAllInputs() {
  for (int i=0; i<8; i++) {
    // The input is considered active (HIGH) when the GPIO pin is pulled LOW.
    // We invert the reading from digitalRead.
    current_di_states[i] = !digitalRead(inputPins[i]);
  }
}

void Io::checkInputChanges() {
  for (int i=0; i<8; i++) {
    if (current_di_states[i] != previous_di_states[i]) {
      previous_di_states[i] = current_di_states[i];
      String state_str = current_di_states[i] ? "HIGH" : "LOW";
      String message = "GPIO" + String(inputPins[i]) + " (DI_" + String(i) + ") changed to " + state_str;
      
      // Log the change and send an SNMP trap.
      System::log(LogLevel::INFO, message);
      Snmp::sendTrap(message.c_str());
    }
  }
}

void Io::setDigitalOutput(uint8_t pin, bool state) {
  if (expander_ok && pin < 8) {
    expander.digitalWrite(pin, state ? HIGH : LOW);
  }
}

bool Io::getDigitalInput(uint8_t pin) {
  if (pin < 8) {
    return current_di_states[pin];
  }
  return false;
}

void Io::setBuzzer(bool state) {
  digitalWrite(buzzerPin, state ? HIGH : LOW);
}`,
        'system.h': `/**
 * @file       system.h
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Header for system-level functions like logging, watchdog, and error handling.
 *             This module provides core utilities used by all other parts of the firmware.
 */
#ifndef SYSTEM_H
#define SYSTEM_H

#include <Arduino.h>

// Define log levels for structured logging, matching the web app's SystemLogService.
enum class LogLevel {
  DEBUG,
  INFO,
  WARN,
  ERROR
};

class System {
public:
  /**
   * @brief Initializes system components, primarily the ESP32's task watchdog timer.
   */
  static void initialize();

  /**
   * @brief Main system loop. Responsible for resetting ("petting") the watchdog timer.
   * Must be called repeatedly from the main sketch loop.
   */
  static void loop();

  /**
   * @brief Centralized logging function.
   * Logs a message to both the Serial monitor and broadcasts it to the UI via WebSocket.
   * @param level The severity level of the log message.
   * @param message The message to log.
   */
  static void log(LogLevel level, const String& message);
  
  /**
   * @brief Handles a critical, unrecoverable error.
   * Logs the error message and puts the system into a visual error state using the LEDs.
   * @param message The error message to log.
   */
  static void handleError(const String& message);

  /**
   * @brief Triggers a software reboot of the ESP32.
   */
  static void rebootDevice();

private:
  /**
   * @brief Resets the ESP32's task watchdog timer to prevent a reboot.
   */
  static void petWatchdog();
};

#endif // SYSTEM_H`,
        'system.cpp': `/**
 * @file       system.cpp
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Implementation of system-level functions, including watchdog, logging,
 *             and device reboot control. This provides the foundational stability and
 *             diagnostics for the entire firmware.
 */
#include "system.h"
#include "network.h"
#include "leds.h"
#include "config.h"
#include <esp_task_wdt.h>

// Helper function to convert LogLevel enum to a printable string.
const char* logLevelToString(LogLevel level) {
    switch (level) {
        case LogLevel::DEBUG: return "DEBUG";
        case LogLevel::INFO:  return "INFO";
        case LogLevel::WARN:  return "WARN";
        case LogLevel::ERROR: return "ERROR";
        default:              return "UNKNOWN";
    }
}

void System::initialize() {
  // Initialize the ESP32 Task Watchdog Timer if enabled in the config.
  const auto& sysConf = Config::getSystemConfig();
  if (sysConf.WATCHDOG) {
    // Initialize the WDT with a timeout from config and enable panic mode,
    // which will cause a reboot if the WDT is not reset in time.
    esp_task_wdt_init(sysConf.WATCHDOG_TIMEOUT, true); 
    esp_task_wdt_add(NULL); // Add the current task (the Arduino loop) to be monitored.
    log(LogLevel::INFO, "Task Watchdog enabled with timeout of " + String(sysConf.WATCHDOG_TIMEOUT) + " seconds.");
  } else {
    log(LogLevel::INFO, "Task Watchdog is disabled in config.");
  }
}

void System::loop() {
  if (Config::getSystemConfig().WATCHDOG) {
    petWatchdog();
  }
}

void System::petWatchdog() {
  // This function must be called more frequently than the watchdog timeout period.
  esp_task_wdt_reset();
}

void System::log(LogLevel level, const String& message) {
  String logEntry = String(logLevelToString(level)) + ": " + message;
  
  // Also print to the hardware Serial port for local debugging via USB.
  Serial.println(logEntry);
  
  // Broadcast the log entry to all connected WebSocket clients for the UI console.
  Network::broadcast(logEntry);
}

void System::handleError(const String& message) {
  log(LogLevel::ERROR, message);
  Leds::setErrorState(); // Put LEDs into a visual error state (e.g., solid red).
}

void System::rebootDevice() {
  log(LogLevel::WARN, "Rebooting device now...");
  delay(100); // Allow a moment for the log message to be sent over WebSocket.
  ESP.restart();
}`,
        'leds.h': `/**
 * @file       leds.h
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Header for controlling NeoPixel LED strips (WS2815) and the onboard LED.
 *             Manages initialization, animations, and status indicators.
 */
#ifndef LEDS_H
#define LEDS_H

#include <Arduino.h>

class Leds {
public:
  /**
   * @brief Initializes the NeoPixel strips and onboard LED pin.
   */
  static void initialize();

  /**
   * @brief Main LED loop. In a full implementation, this would update LED animations
   *        based on servo positions and system state. Stubbed in this version.
   */
  static void loop();

  /**
   * @brief Plays a pre-defined animation sequence on the LED strips at startup.
   */
  static void playStartupAnimation();
  
  /**
   * @brief Set the onboard LED to a specific state.
   * @param on Boolean state (true for on, false for off).
   * @param color The color of the LED (not fully implemented on simple GPIO).
   */
  static void setOnboardLed(bool on, uint32_t color = 0);

  /**
   * @brief Put all LEDs into a persistent error state (e.g., solid red)
   *        to visually indicate a critical failure.
   */
  static void setErrorState();

private:
  // Placeholder update functions for each strip.
  static void updateStripX();
  static void updateStripY();
  static void updateStripYY();
};

#endif // LEDS_H`,
        'leds.cpp': `/**
 * @file       leds.cpp
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Implementation of LED control for startup animations, operational status,
 *             and error indication using the Adafruit_NeoPixel library.
 */
#include "leds.h"
#include "config.h"
#include "system.h"
#include <Adafruit_NeoPixel.h>

// Pin definitions from web app GPIO reference.
#define ONBOARD_LED_PIN 38
#define LED_X_PIN 1
#define LED_Y_PIN 2
#define LED_YY_PIN 3

// NeoPixel strip objects. The number of pixels is retrieved from the config.
Adafruit_NeoPixel stripX(Config::getLedsConfig().COUNT_X, LED_X_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel stripY(Config::getLedsConfig().COUNT_Y, LED_Y_PIN, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel stripYY(Config::getLedsConfig().COUNT_YY, LED_YY_PIN, NEO_GRB + NEO_KHZ800);

void Leds::initialize() {
  pinMode(ONBOARD_LED_PIN, OUTPUT);
  digitalWrite(ONBOARD_LED_PIN, LOW); // Start with LED off.

  stripX.begin();
  stripY.begin();
  stripYY.begin();
  
  stripX.setBrightness(Config::getLedsConfig().DEFAULT_BRIGHTNESS_X);
  stripY.setBrightness(Config::getLedsConfig().DEFAULT_BRIGHTNESS_Y);
  stripYY.setBrightness(Config::getLedsConfig().DEFAULT_BRIGHTNESS_YY);
  
  // Clear all strips to ensure they are off at startup.
  stripX.clear();
  stripY.clear();
  stripYY.clear();
  stripX.show();
  stripY.show();
  stripYY.show();
  
  System::log(LogLevel::INFO, "LED subsystem initialized.");
}

void Leds::loop() {
  // The complex, real-time LED animations seen in the UI (position tracking,
  // idle dimming, etc.) are simulated in the Angular ServoControlService.
  // A real firmware implementation would calculate and update the pixel states here
  // based on live data from the servo and I/O modules.
}

void Leds::playStartupAnimation() {
  // A simple animation: a white light chases down the X strip.
  System::log(LogLevel::DEBUG, "Playing LED startup animation...");
  for(int i=0; i < stripX.numPixels(); i++) {
    stripX.setPixelColor(i, stripX.Color(255, 255, 255));
    if (i > 5) {
      stripX.setPixelColor(i - 6, 0); // Erase the tail
    }
    stripX.show();
    delay(2);
  }
  stripX.clear();
  stripX.show();
  // A full implementation would animate Y and YY strips as well.
  System::log(LogLevel::DEBUG, "Startup animation complete.");
}

void Leds::setOnboardLed(bool on, uint32_t color) {
  // The onboard LED on this hardware is a simple single-color LED, not RGB.
  // We just turn it on or off. The color parameter is ignored.
  digitalWrite(ONBOARD_LED_PIN, on ? HIGH : LOW);
}

void Leds::setErrorState() {
  // Set all pixels of all strips to solid red at max brightness.
  stripX.fill(stripX.Color(255, 0, 0));
  stripY.fill(stripY.Color(255, 0, 0));
  stripYY.fill(stripYY.Color(255, 0, 0));
  stripX.setBrightness(255);
  stripY.setBrightness(255);
  stripYY.setBrightness(255);
  stripX.show();
  stripY.show();
  stripYY.show();
  
  // Also turn on the onboard LED to indicate an error.
  setOnboardLed(true);
}`,
        'alexa.h': `/**
 * @file       alexa.h
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Header for Alexa integration using the Espalexa library. This allows
 *             the fireCNC controller to be discovered as smart home devices by Alexa.
 */
#ifndef ALEXA_H
#define ALEXA_H

#include <Arduino.h>

class Alexa {
public:
  /**
   * @brief Initializes the Espalexa library and adds the discoverable devices
   *        if Alexa support is enabled in the configuration.
   */
  static void initialize();
  
  /**
   * @brief Main loop for Espalexa. Handles incoming requests from Alexa.
   * Must be called repeatedly from the main sketch loop.
   */
  static void loop();

private:
  // Callback functions that are triggered when Alexa changes a device's state.
  static void onOnboardLedChange(uint8_t brightness);
  static void onBuzzerChange(uint8_t brightness);
  // A generic callback for any of the main LED strip brightness controls.
  static void onLedStripChange(uint8_t brightness);
};

#endif // ALEXA_H`,
        'alexa.cpp': `/**
 * @file       alexa.cpp
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Implementation of Alexa device simulation using Espalexa, allowing voice
 *             control for various device functions like the onboard LED, buzzer, and main LEDs.
 */
#include "alexa.h"
#include "config.h"
#include "io.h"
#include "leds.h"
#include "system.h"
#include <Espalexa.h>

Espalexa espalexa;

void Alexa::initialize() {
  const AlexaConfig& alexaConf = Config::getAlexaConfig();
  if (!alexaConf.ENABLED) {
    System::log(LogLevel::INFO, "Alexa integration is disabled in config.");
    return;
  }

  // Add devices that can be discovered by Alexa, using names from the config file.
  // The callback function is what gets executed when Alexa sends a command.
  espalexa.addDevice(alexaConf.ONBOARD_LED_DEVICE, onOnboardLedChange, EspalexaDeviceType::dimmable);
  espalexa.addDevice(alexaConf.SYSTEM_BUZZER_DEVICE, onBuzzerChange, EspalexaDeviceType::onoff);
  
  // In this simplified version, all LED strip brightness devices control the same thing.
  // A full implementation would distinguish between them.
  espalexa.addDevice("LEDX Brightness", onLedStripChange, EspalexaDeviceType::dimmable);
  espalexa.addDevice("LEDY Brightness", onLedStripChange, EspalexaDeviceType::dimmable);
  espalexa.addDevice("LEDYY Brightness", onLedStripChange, EspalexaDeviceType::dimmable);
  
  if (espalexa.begin()) {
    System::log(LogLevel::INFO, "Espalexa started. Found " + String(espalexa.getDeviceCount()) + " devices.");
  } else {
    System::log(LogLevel::ERROR, "Espalexa failed to start.");
  }
}

void Alexa::loop() {
  if (Config::getAlexaConfig().ENABLED) {
    espalexa.loop();
  }
}

/**
 * @brief Callback for the onboard LED. Handles on/off and brightness.
 * @param brightness Alexa sends a value from 0 (off) to 255 (full brightness).
 */
void Alexa::onOnboardLedChange(uint8_t brightness) {
  bool state = (brightness > 0);
  Leds::setOnboardLed(state);
  // Log the action for debugging.
  String logMsg = "Alexa: Onboard LED set to " + String(state ? "ON" : "OFF");
  if (state) {
    logMsg += " at brightness " + String(brightness);
  }
  System::log(LogLevel::INFO, logMsg);
}

/**
 * @brief Callback for the system buzzer.
 * @param brightness For on/off devices, >0 is ON, 0 is OFF.
 */
void Alexa::onBuzzerChange(uint8_t brightness) {
  bool state = (brightness > 0);
  Io::setBuzzer(state);
  System::log(LogLevel::INFO, "Alexa: Buzzer set to " + String(state ? "ON" : "OFF"));
}

/**
 * @brief Callback for the main LED strips.
 * @param brightness The brightness value (0-255) from Alexa.
 */
void Alexa::onLedStripChange(uint8_t brightness) {
  // This is a simplified control. A real implementation would integrate this
  // with the main Leds::loop() function to avoid conflicting updates.
  // For now, we just log the command.
  System::log(LogLevel::INFO, "Alexa: LED strips brightness command received: " + String(brightness));
}`,
        'servos.h': `/**
 * @file       servos.h
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Header for controlling servo motors via the RS485 bus using Modbus RTU.
 */
#ifndef SERVOS_H
#define SERVOS_H

#include <Arduino.h>

class Servos {
public:
  /**
   * @brief Initializes the HardwareSerial port for RS485 and the Modbus RTU client.
   */
  static void initialize();

  /**
   * @brief Main servo loop. Periodically polls servos for their status.
   * Must be called repeatedly from the main sketch loop.
   */
  static void loop();
  
  /**
   * @brief Sends a command to move a specific servo axis to a position.
   * @param axis The axis to move ('X', 'Y', 'YY').
   * @param position The target position.
   */
  static void moveTo(char axis, int position);

  /**
   * @brief Reads the current position of a specific servo axis.
   * @param axis The axis to query ('X', 'Y', 'YY').
   * @return The current position, or -1 on error.
   */
  static int getPosition(char axis);

private:
  /**
   * @brief Internal function to poll all configured servo drivers for their status registers.
   */
  static void pollServoStatus();
};

#endif // SERVOS_H`,
        'servos.cpp': `/**
 * @file       servos.cpp
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Implementation of servo control using Modbus RTU protocol over RS485.
 *             This module is responsible for communicating with external servo motor drivers.
 */
#include "servos.h"
#include "system.h"
#include "config.h"
#include <ArduinoModbus.h>
#include <HardwareSerial.h>

// Use Serial2 for RS485 communication, as per the GPIO reference.
#define RS485_SERIAL Serial2
// The RTS pin is used to control the direction of the RS485 transceiver.
#define RS485_RTS_PIN 21

void Servos::initialize() {
  // Initialize Serial2 for RS485 communication. Baud rate depends on servo config.
  RS485_SERIAL.begin(9600, SERIAL_8N1);
  pinMode(RS485_RTS_PIN, OUTPUT);
  digitalWrite(RS485_RTS_PIN, LOW); // Set to receive mode by default.

  // Initialize ModbusRTUClient on the specified serial port.
  if (!ModbusRTUClient.begin(RS485_SERIAL, RS485_RTS_PIN)) {
    System::log(LogLevel::ERROR, "Failed to start Modbus RTU client for servos.");
  } else {
    System::log(LogLevel::INFO, "Modbus RTU client started for servo control.");
  }
}

void Servos::loop() {
  // Periodically poll servos for their status and position.
  static unsigned long last_poll_time = 0;
  if (millis() - last_poll_time > 200) { // Poll every 200ms
    pollServoStatus();
    last_poll_time = millis();
  }
}

void Servos::moveTo(char axis, int position) {
  const auto& servoConf = Config::getServosConfig();
  int slaveId = -1;
  if (axis == 'X') slaveId = servoConf.SLAVE_ID_X;
  else if (axis == 'Y') slaveId = servoConf.SLAVE_ID_Y;
  else if (axis == 'YY') slaveId = servoConf.SLAVE_ID_YY;
  
  if (slaveId != -1) {
    // A real implementation would use the correct register address for the servo driver.
    // This is a placeholder example.
    if (!ModbusRTUClient.holdingRegisterWrite(slaveId, 0x1000, position)) {
      System::log(LogLevel::WARN, "Failed to send move command to servo " + String(axis));
    } else {
      System::log(LogLevel::DEBUG, "Sent move command to servo " + String(axis));
    }
  }
}

int Servos::getPosition(char axis) {
  // Similar logic to moveTo to get the correct slaveId.
  // Then use ModbusRTUClient.holdingRegisterRead(...) to get the position.
  return 0; // Placeholder return value.
}

void Servos::pollServoStatus() {
  // In a real application, you would cycle through each configured servo's slave ID,
  // read its status registers via ModbusRTUClient.holdingRegisterRead(...),
  // and then broadcast the updated positions and limit switch states to the UI via WebSocket.
  // This function is a placeholder for that logic.
}`,
        'snmp.h': `/**
 * @file       snmp.h
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Header for the SNMP Agent implementation. This is a simulation and
 *             focuses on the ability to send SNMP traps.
 */
#ifndef SNMP_H
#define SNMP_H

#include <Arduino.h>

class Snmp {
public:
  /**
   * @brief Initializes the SNMP agent (simulated).
   */
  static void initialize();
  
  /**
   * @brief Main SNMP loop. In a real agent, this would listen for incoming GET requests.
   * Stubbed in this simulation.
   */
  static void loop();

  /**
   * @brief Sends an SNMP trap message to the configured target.
   * @param message The message content of the trap.
   */
  static void sendTrap(const char* message);
};

#endif // SNMP_H`,
        'snmp.cpp': `/**
 * @file       snmp.cpp
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Implementation of the SNMP agent. This is a conceptual simulation, as a
 *             full SNMP agent is a complex library. It demonstrates how OIDs would be
 *             handled in concept and implements sending basic UDP packets as simulated SNMP traps.
 */
#include "snmp.h"
#include "system.h"
#include "config.h"
#include <WiFiUdp.h> // Using WiFiUDP as it works for both WiFi and Ethernet connections.

WiFiUDP Udp;

void Snmp::initialize() {
  const auto& snmpConf = Config::getSnmpConfig();
  if (!snmpConf.AGENT_ENABLED) {
    System::log(LogLevel::INFO, "SNMP Agent is disabled in config.");
    return;
  }
  
  // A real SNMP library (like Agentuino) would be initialized here.
  // It would involve defining the Management Information Base (MIB) with all the
  // Object Identifiers (OIDs) and linking them to callback functions that return
  // the current value (e.g., adcVoltage, temperature, etc.).
  
  System::log(LogLevel::INFO, "SNMP Agent initialized (Simulated).");
}

void Snmp::loop() {
  const auto& snmpConf = Config::getSnmpConfig();
  if (!snmpConf.AGENT_ENABLED) {
    return;
  }
  
  // In a real agent, this loop would parse incoming UDP packets on the SNMP port (161),
  // check the community string, find the requested OID in its MIB,
  // call the associated function to get the value, and send a response packet.
  // This is a complex process and is omitted in this simulation.
}

void Snmp::sendTrap(const char* message) {
  const auto& snmpConf = Config::getSnmpConfig();
  if (!snmpConf.TRAPS_ENABLED) {
    return;
  }

  // Resolve the trap target IP address.
  IPAddress trapTarget;
  if (!trapTarget.fromString(snmpConf.TRAP_TARGET)) {
      System::log(LogLevel::ERROR, "Invalid SNMP trap target IP: " + snmpConf.TRAP_TARGET);
      return;
  }

  // This is a highly simplified trap packet simulation. A real SNMP trap has a
  // very specific and complex structure (PDU - Protocol Data Unit).
  // We are just sending a plain text message over UDP for demonstration.
  String trapMessage = "SNMP TRAP from fireCNC (" + snmpConf.COMMUNITY + "): " + String(message);
  
  Udp.beginPacket(trapTarget, snmpConf.TRAP_PORT);
  Udp.write((const uint8_t*)trapMessage.c_str(), trapMessage.length());
  Udp.endPacket();
  
  System::log(LogLevel::DEBUG, "Sent SNMP Trap (Simulated) to " + snmpConf.TRAP_TARGET);
}`,
        'shell.h': `/**
 * @file       shell.h
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Header for the interactive shell, which processes commands received
 *             via WebSocket from the UI's shell page.
 */
#ifndef SHELL_H
#define SHELL_H

#include <Arduino.h>

class Shell {
public:
  /**
   * @brief Processes a command string received from the UI.
   * @param command The full command string to execute.
   * @return The output or result of the command to be sent back to the UI.
   */
  static String processCommand(String command);
};

#endif // SHELL_H`,
        'shell.cpp': `/**
 * @file       shell.cpp
 * @project    fireCNC
 * @author     Mark Dyer (Reverse-engineered from Angular App)
 * @version    0.0.7
 * @date       2024-08-16
 * @brief      Implementation of the interactive shell. Commands are received via
 *             WebSocket and processed here, interacting with other modules like
 *             System and SD card for functionality.
 */
#include "shell.h"
#include "system.h"
#include "config.h"
#include <SD.h>

String Shell::processCommand(String command) {
  command.trim();
  if (command.length() == 0) {
    return "";
  }

  // Tokenize the command string
  int spaceIndex = command.indexOf(' ');
  String cmd = (spaceIndex == -1) ? command : command.substring(0, spaceIndex);
  String args = (spaceIndex == -1) ? "" : command.substring(spaceIndex + 1);

  if (cmd.equalsIgnoreCase("help")) {
    return "Available commands: help, reboot, ls, cat <file>, free";
  }
  
  if (cmd.equalsIgnoreCase("reboot")) {
    System::rebootDevice(); // This function will not return.
    return "Rebooting...";
  }

  if (cmd.equalsIgnoreCase("free")) {
    return "Free Heap: " + String(ESP.getFreeHeap()) + " bytes";
  }

  if (cmd.equalsIgnoreCase("ls")) {
    // A more robust implementation would handle paths from args.
    File root = SD.open("/");
    if (!root) {
      return "ls: cannot open root directory on SD card.";
    }
    String fileList = "Listing files on SD card:\\r\\n";
    while (true) {
      File entry = root.openNextFile();
      if (!entry) {
        break; // no more files
      }
      fileList += entry.name();
      if (entry.isDirectory()) {
        fileList += "/";
      }
      fileList += "\\r\\n";
      entry.close();
    }
    root.close();
    return fileList;
  }

  if (cmd.equalsIgnoreCase("cat")) {
    if (args.length() == 0) {
      return "cat: missing file operand";
    }
    String filePath = args;
    if (!filePath.startsWith("/")) {
      filePath = "/" + filePath;
    }

    File file = SD.open(filePath);
    if (!file) {
      return "cat: " + filePath + ": No such file or directory";
    }
    if (file.isDirectory()) {
      file.close();
      return "cat: " + filePath + ": Is a directory";
    }

    String content = "";
    while (file.available()) {
      // Read in chunks to avoid large string concatenations in a tight loop
      char buf[64];
      int bytesRead = file.readBytes(buf, sizeof(buf) - 1);
      buf[bytesRead] = '\\0';
      content += buf;
    }
    file.close();
    return content;
  }

  return "fireCNC: command not found: " + cmd;
}`,
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

  updateFileContent(path: string, newContent: string): boolean {
    this.lastSaveError.set(null); // Clear previous errors
    const fileSignal = this.fileData.get(path);
    if (!fileSignal) {
      this.lastSaveError.set(`File not found: ${path}`);
      return false;
    }
    try {
      fileSignal.set(newContent);
      console.log(`[Firmware Service] Updated content for ${path}`);
      return true;
    } catch (e: any) {
      this.lastSaveError.set(`Failed to update content for ${path}: ${e.message}`);
      console.error(`Failed to update content for ${path}:`, e);
      return false;
    }
  }
}