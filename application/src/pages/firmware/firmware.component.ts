import { ChangeDetectionStrategy, Component, Signal, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ArduinoService, SystemInfo } from '../../services/arduino.service';
import { RouterLink } from '@angular/router';

// Define interfaces locally for type safety
interface Library {
  name: string;
  version: string;
  description: string;
  url: string;
}

interface FirmwareComponentInfo {
  name: string;
  version: string;
  description: string;
  url?: string; // URL is optional for base firmware components if not directly applicable
}

@Component({
  selector: 'app-firmware',
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './firmware.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FirmwareComponent {
  private arduinoService = inject(ArduinoService);
  systemInfo: Signal<SystemInfo> = this.arduinoService.systemInfo;

  uiLibs: Library[] = [
    { name: 'Angular', version: '20.3.9', description: 'Core front-end framework.', url: 'https://angular.dev/' },
    { name: 'Tailwind CSS', version: '3.4.4', description: 'Utility-first CSS framework.', url: 'https://tailwindcss.com/' },
    { name: 'Font Awesome', version: '6.5.2', description: 'Icon toolkit.', url: 'https://fontawesome.com/' },
    { name: 'RxJS', version: '7.8.3', description: 'Reactive programming library.', url: 'https://rxjs.dev/' },
  ];

  arduinoLibs: Library[] = [
    { name: 'Ethernet', version: '2.0.4', description: 'For W5500 Ethernet connectivity.', url: 'https://github.com/arduino-libraries/Ethernet' },
    { name: 'ArduinoJson', version: '7.2.0', description: 'JSON serialization/deserialization for config files.', url: 'https://arduinojson.org/' },
    { name: 'RTClib', version: '2.2.1', description: 'Real-Time Clock (PCF8523) management.', url: 'https://github.com/adafruit/RTClib' },
    { name: 'SD', version: '2.0.5', description: 'SD card file system access.', url: 'https://github.com/arduino-libraries/SD' },
    { name: 'ESP32-CAN', version: '2.0.0', description: 'Controller Area Network communication.', url: 'https://github.com/collin80/ESP32_CAN' },
    { name: 'Wire', version: '3.0.1', description: 'I2C communication for RTC and I/O expander (via Arduino Core).', url: 'https://www.arduino.cc/en/Reference/Wire' },
    { name: 'Adafruit NeoPixel', version: '1.12.4', description: 'Control of WS2815 addressable LED strips.', url: 'https://github.com/adafruit/Adafruit_NeoPixel' },
    { name: 'Espalexa', version: '2.9.1', description: 'Emulates Alexa devices on the ESP32.', url: 'https://github.com/Aircoookie/Espalexa' },
    { name: 'ArduinoModbus', version: '1.2.1', description: 'For RS485 communication with servo drivers.', url: 'https://www.arduino.cc/reference/en/libraries/arduinomodbus/' },
    { name: 'Adafruit TCA9554', version: '1.1.3', description: 'For the TCA9554 I/O Expander.', url: 'https://github.com/adafruit/Adafruit_TCA9554' },
  ];

  baseFirmware: FirmwareComponentInfo[] = [
      { name: 'ESP-IDF', version: 'v5.3.1', description: 'Espressif IoT Development Framework.', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/' },
      { name: 'Arduino Core', version: '3.0.1', description: 'Arduino core for ESP32.', url: 'https://github.com/espressif/arduino-esp32' },
      { name: 'FreeRTOS', version: '11.1.0', description: 'Real-time operating system kernel.', url: 'https://www.freertos.org/' },
      { name: 'Bootloader', version: '3.3', description: 'Device startup bootloader (from partition table).', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/app_overview.html#bootloader' },
  ];
}