// #include "LiquidCrystal_I2C.h"

// LiquidCrystal_I2C lcd = LiquidCrystal_I2C(0x3F, 16, 2);
#include <SoftwareSerial.h>

SoftwareSerial BTserial(3, 2);
byte data = 0x01;  // RX | TX
const int buzzerPin = 12;
const int baudRate = 9600;
String status;


void setup() {
  Serial.begin(baudRate);
  // HC-05 default serial speed for Command mode is 9600
  BTserial.begin(baudRate);
  // Buzzer connected to pin D12
  pinMode(buzzerPin, OUTPUT);
  // lcd.init();
  // lcd.backlight();
}

void loop() {
  //gas value from A0
  int sensorValue = analogRead(A0);
  Serial.print("GAS:");
  //Read in serial monitor
  Serial.println(sensorValue);


  /*
    Normal Air (Baseline): 50 – 150. [NORMAL]

    Caution/Gas Present: 200 – 700 [700 ALERT]

    Danger/Alarm Level: Above 800.[CRITICAL]
  */

  if (sensorValue >= 800) {
    status = "CRITICAL";
    // CRITICAL: Send proper format for mobile app
    String data = "GAS:" + String(sensorValue) + "," + status;
    BTserial.println(data);

    digitalWrite(buzzerPin, HIGH);
    delay(100);
    digitalWrite(buzzerPin, LOW);
    delay(100);
    digitalWrite(buzzerPin, HIGH);
    delay(100);
    digitalWrite(buzzerPin, LOW);
    delay(100);
    digitalWrite(buzzerPin, HIGH);
    delay(100);
    digitalWrite(buzzerPin, LOW);
    delay(100);
  } else if (sensorValue >= 700 && sensorValue <= 800) {
    status = "ALERT";
    String data = "GAS:" + String(sensorValue) + "," + status;
    BTserial.println(data);

    digitalWrite(buzzerPin, HIGH);
    delay(1000);
    digitalWrite(buzzerPin, LOW);
    delay(1000);
  } else if (sensorValue >= 400 && sensorValue <= 700) {
    //send only for reading and ploting to graph not for alert
    status = "NORMAL";
    String data = "GAS:" + String(sensorValue) + "," + status;
    BTserial.println(data);
  } else {
    digitalWrite(buzzerPin, LOW);
  }
  delay(3000);
}
