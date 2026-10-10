#define BLYNK_TEMPLATE_ID   "TMPL3--------0"
#define BLYNK_TEMPLATE_NAME "GridAware"
#define BLYNK_AUTH_TOKEN    "RzZiFb------------------MYoW1FRi" // Apna token yaha daalein

#define BLYNK_PRINT Serial

#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include <OneWire.h>
#include <DallasTemperature.h>

char ssid[] = "One Plus Nord";
char pass[] = "vansharma";

// --- PIN DEFINITIONS ---
const int ONE_WIRE_BUS = 4;      // DS18B20 Data pin -> GPIO 4
const int VIB_PIN = 5;           // SW-420 Digital Out -> D5 (GPIO 5)
const int POT_PIN = 34;          // Potentiometer Wiper -> GPIO 34

// --- INITIALIZE SENSORS ---
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Default GridAware Metadata for Serial and Cloud Logging
String transformerName = "GridAware Node 01";
String transformerAddress = "GridAware Main Station";

BlynkTimer timer;

void setup() {
  Serial.begin(115200);
  delay(1000);

  // 1. Start Sensors & Pins
  sensors.begin();
  pinMode(VIB_PIN, INPUT);

  // 2. Connect Wi-Fi and Blynk
  WiFi.begin(ssid, pass);
  Blynk.begin(BLYNK_AUTH_TOKEN, ssid, pass);

  Serial.println("🚀 GridAware Lite Node Ready & Connected!");
}

void sendSensorData() {
  // Read Sensors
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  if (tempC == DEVICE_DISCONNECTED_C) tempC = 25.0;

  int vibState = digitalRead(VIB_PIN);
  int potValue = analogRead(POT_PIN);
  float simulatedLoad = map(potValue, 0, 4095, 0, 200);

  // --- NESTED IF-ELSE RULE-BASED HEALTH EVALUATION ---
  int healthScore = 100;

  if (tempC > 45.0) {
    if (vibState == HIGH || simulatedLoad > 150.0) {
      healthScore = 40; // Critical: High temp + secondary stress
    } else {
      healthScore = 75; // Warning: High temp alone
    }
  } 
  else {
    if (simulatedLoad > 120.0) {
      healthScore = 75; // Warning: High load simulation
    } else if (vibState == HIGH) {
      healthScore = 75; // Warning: Vibration anomaly
    } else {
      healthScore = 100; // Normal Zone
    }
  }

  // Print to Serial Monitor
  Serial.println("----------------------------------------");
  Serial.print("Node:   "); Serial.println(transformerName);
  Serial.print("Temp:   "); Serial.print(tempC); Serial.print("°C | Vib: "); Serial.print(vibState); Serial.print(" | Load: "); Serial.print(simulatedLoad); Serial.print("A | Health: "); Serial.println(healthScore);

  // Send Data to Blynk Virtual Pins
  Blynk.virtualWrite(V1, tempC);          // V1: Temperature
  Blynk.virtualWrite(V2, vibState);       // V2: Vibration State
  Blynk.virtualWrite(V3, simulatedLoad);  // V3: Simulated Load
  Blynk.virtualWrite(V4, healthScore);    // V4: Health Score

  // Range-Based Threshold Notifications
  if (healthScore <= 40) {
    Blynk.logEvent("transformer_alert", String("CRITICAL: " + transformerName + " health dropped to " + String(healthScore) + "%! Immediate inspection required."));
    Serial.println("🚨 CRITICAL ALERT SENT TO BLYNK!");
  } 
  else if (healthScore == 75) {
    Serial.println("⚠️ WARNING RANGE: Elevated thermal or load stress detected.");
  } 
  else {
    Serial.println("✅ NORMAL RANGE: GridAware Operating Safely.");
  }
}

void loop() {
  Blynk.run();
  
  // Send data every 2 seconds
  static unsigned long lastTime = 0;
  if (millis() - lastTime > 2000) {
    lastTime = millis();
    sendSensorData();
  }
}
