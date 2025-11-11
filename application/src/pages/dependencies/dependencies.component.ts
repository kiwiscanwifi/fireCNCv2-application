import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Library {
  name: string;
  version: string;
  description: string;
  url: string;
  license: string;
}

@Component({
  selector: 'app-dependencies',
  imports: [CommonModule, RouterLink],
  templateUrl: './dependencies.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DependenciesComponent {
  uiLibs: Library[] = [
    { name: 'Angular', version: '20.3.9', description: 'Core front-end framework.', url: 'https://angular.dev/', license: 'MIT' },
    { name: 'Tailwind CSS', version: '3.4.4', description: 'Utility-first CSS framework.', url: 'https://tailwindcss.com/', license: 'MIT' },
    { name: 'Font Awesome', version: '6.5.2', description: 'Icon toolkit.', url: 'https://fontawesome.com/', license: 'CC BY 4.0' },
    { name: 'RxJS', version: '7.8.1', description: 'Reactive programming library.', url: 'https://rxjs.dev/', license: 'Apache 2.0' },
    { name: 'CodeMirror', version: '5.65.16', description: 'In-browser code editor.', url: 'https://codemirror.net/', license: 'MIT' },
  ];

  arduinoLibs: Library[] = [
    { name: 'Ethernet', version: '2.0.4', description: 'For W5500 Ethernet connectivity.', url: 'https://github.com/arduino-libraries/Ethernet', license: 'LGPL-2.1' },
    { name: 'ArduinoJson', version: '7.2.0', description: 'JSON serialization/deserialization.', url: 'https://arduinojson.org/', license: 'MIT' },
    { name: 'RTClib', version: '2.2.1', description: 'Real-Time Clock (PCF8523) management.', url: 'https://github.com/adafruit/RTClib', license: 'MIT' },
    { name: 'SD', version: '2.0.5', description: 'SD card file system access.', url: 'https://github.com/arduino-libraries/SD', license: 'LGPL-2.1' },
    { name: 'ESP32-CAN', version: '2.0.0', description: 'Controller Area Network communication.', url: 'https://github.com/collin80/ESP32_CAN', license: 'MIT' },
    { name: 'Wire', version: '3.0.1', description: 'I2C communication (via Arduino Core).', url: 'https://www.arduino.cc/en/Reference/Wire', license: 'LGPL-2.1' },
    { name: 'Adafruit NeoPixel', version: '1.12.4', description: 'Control of WS2815 LED strips.', url: 'https://github.com/adafruit/Adafruit_NeoPixel', license: 'LGPL-3.0' },
    { name: 'Espalexa', version: '2.9.1', description: 'Emulates Alexa devices on the ESP32.', url: 'https://github.com/Aircoookie/Espalexa', license: 'MIT' },
    { name: 'eModbus', version: '1.0.5', description: 'ESP32-compatible Modbus RTU/TCP library.', url: 'https://github.com/eModbus/eModbus', license: 'MIT' },
    { name: 'Adafruit XCA9554', version: '1.1.3', description: 'For the XCA9554 I/O Expander.', url: 'https://github.com/adafruit/Adafruit_XCA9554', license: 'MIT' },
  ];

  baseFirmware: Library[] = [
      { name: 'ESP-IDF', version: 'v5.3.1', description: 'Espressif IoT Development Framework.', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/', license: 'Apache 2.0' },
      { name: 'Arduino Core for ESP32', version: '3.0.1', description: 'Arduino core for ESP32.', url: 'https://github.com/espressif/arduino-esp32', license: 'LGPL-2.1' },
      { name: 'FreeRTOS', version: '11.1.0', description: 'Real-time operating system kernel.', url: 'https://www.freertos.org/', license: 'MIT' },
  ];
}
