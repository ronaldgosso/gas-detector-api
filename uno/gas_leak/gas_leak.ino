#include <SoftwareSerial.h>
#include "LiquidCrystal_I2C.h" 


SoftwareSerial BTserial(3, 2);  // RX | TX
//!TODO: change later to buzzerPin = 12
const int buzzerPin = 13;
const int baudRate = 9600;
const long WARMUP_MS = 30000;  // MQ warm-up time (ms)

// Wiring: SDA pin is connected to A4 and SCL pin to A5.
// Connect to LCD via I2C, default address 0x27 (A0-A2 not jumpered)
LiquidCrystal_I2C lcd = LiquidCrystal_I2C(0x27, 16, 2);
String data;

void setup() {
  Serial.begin(baudRate);
  lcd.init();
  lcd.backlight();
  // HC-05 default serial speed for Command mode is 9600
  BTserial.begin(baudRate);
  // Buzzer connected to pin D12
  pinMode(buzzerPin, OUTPUT);
  pinMode(A0,INPUT_PULLUP);
  Serial.println("Warming up MQ Sensor...");
  delay(WARMUP_MS);
  Serial.println("Ready.....");
}

void loop() {
  //gas value from A0
  int sensorValue = analogRead(A0);

  /*
    Normal Air (Baseline): 50 – 150. [NORMAL]

    Caution/Gas Present: 200 – 700 [700 NORMAL]

    Danger/Alarm Level: Above 800.[ALERT]
  */

  if (sensorValue >= 800) {
    data = "GAS:" + String(sensorValue) + ",ALERT";

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
    data = "GAS:" + String(sensorValue) + ",NORMAL";

    digitalWrite(buzzerPin, HIGH);
    delay(1000);
    digitalWrite(buzzerPin, LOW);
    delay(1000);
  } else if (sensorValue >= 400 && sensorValue <= 700) {
    //send only for reading and ploting to graph not for alert
    data = "GAS:" + String(sensorValue) + ",NORMAL";
  } else {
    digitalWrite(buzzerPin, LOW);
  }

  BTserial.println(data);
  Serial.println(data);

  lcd.setCursor(2, 0);
  lcd.print("GAS LEVEL:");
  lcd.setCursor(2, 1); 
  String senValue = String(sensorValue);
  if(senValue.length() == 4){
    lcd.print(senValue);
  }else{
    String input = senValue + " ";
    lcd.print(input);
  }
  //delay 5 seconds
  delay(5000);
}
