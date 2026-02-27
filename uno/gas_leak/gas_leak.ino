// #include "LiquidCrystal_I2C.h"

// LiquidCrystal_I2C lcd = LiquidCrystal_I2C(0x3F, 16, 2);
#include <SoftwareSerial.h>

SoftwareSerial BTserial(3, 2);
byte data = 0x01;  // RX | TX
const int buzzerPin = 12;
const int baudRate = 9600;


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
  int sensorValue = analogRead(A0);
  Serial.print("Gas:");
  Serial.println(sensorValue);

  /*
    Normal Air (Baseline): 50 – 150.

    Caution/Gas Present: 200 – 400

    Danger/Alarm Level: Above 700.
  */

  // if (sensorValue >= 700) {
  //   digitalWrite(buzzerPin, HIGH);
  //   delay(100);
  //   digitalWrite(buzzerPin, LOW);
  //   delay(100);
  //   digitalWrite(buzzerPin, HIGH);
  //   delay(100);
  //   digitalWrite(buzzerPin, LOW);
  //   delay(100);
  //   digitalWrite(buzzerPin, HIGH);
  //   delay(100);
  //   digitalWrite(buzzerPin, LOW);
  //   delay(100);
  // } else if (sensorValue >= 450) {
  //   digitalWrite(buzzerPin, HIGH);
  //   delay(1000);
  //   digitalWrite(buzzerPin, LOW);
  //   delay(1000);
  // } else {
  //   digitalWrite(buzzerPin, LOW);
  // }
  delay(3000);
  // if (BTserial.available()) {
  BTserial.println(sensorValue);
  delay(3000);
  // }


  // lcd.clear();
  // lcd.setCursor(2, 1);
  // lcd.print(sensorValue);

  // delay(1000);
}