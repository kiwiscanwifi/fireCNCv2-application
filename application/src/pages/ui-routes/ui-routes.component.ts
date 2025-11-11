import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from '../../services/markdown.service';

interface Endpoint {
  path: string;
  method?: string;
  description: string;
  responseBody?: string;
}

interface EndpointCategory {
  title: string;
  icon: string;
  endpoints: Endpoint[];
}

@Component({
  selector: 'app-ui-routes',
  imports: [CommonModule, RouterLink],
  templateUrl: './ui-routes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UiRoutesComponent {
  private markdownService = inject(MarkdownService);

  uiRoutesCategory: EndpointCategory = {
    title: 'UI Routes',
    icon: 'fa-solid fa-route',
    endpoints: [
      { 
        path: '/activity/console', 
        description: 'Live WebSocket console output.',
        responseBody: `Displays a real-time stream of all messages sent from the simulated device via the WebSocket connection. It includes a button to clear the log.`
      },
      { 
        path: '/activity/landing', 
        description: 'Mobile/tablet optimized activity overview.',
        responseBody: `A mobile-friendly landing page presenting a list of links to various activity logs (Console Output, System Log, SNMP Log) with descriptions.`
      },
      { 
        path: '/activity/snmp-traps', 
        description: 'Log of sent SNMP traps.',
        responseBody: `Displays a chronological log of all SNMP trap notifications that the simulated device has sent, including timestamps and messages. It includes a button to clear the log.`
      },
      { 
        path: '/activity/system-log', 
        description: 'Filtered system event logs.',
        responseBody: `Shows a formatted, color-coded log of important system events (INFO, WARN, ERROR, DEBUG) with timestamps. Users can filter log entries by level and clear the displayed logs.`
      },
      { 
        path: '/alexa', 
        description: 'Simulated Alexa device control and announcements.',
        responseBody: `Presents a list of simulated Alexa-discoverable devices (e.g., Onboard LED, System Buzzer, LEDX Brightness) with controls to change their states, mimicking voice commands. It also displays a log of Alexa announcements made by the device.`
      },
      { 
        path: '/dashboard', 
        description: 'Main application dashboard.',
        responseBody: `The dashboard renders a customizable layout of widgets based on user preferences. Common widgets include:
- **Digital Outputs (8-DO)**: Toggles for controlling outputs.
- **Digital Inputs (8-DI)**: Status indicators for inputs.
- **System Details**: Firmware version, uptime, IP address.
- **Storage Info**: SD card, local storage, EEPROM usage.
- **Memory Info**: SRAM usage and fragmentation.
- **Analog Inputs**: Real-time analog sensor readings.
- **Module Widgets**: Custom widgets for installed expansion modules.

The specific content and arrangement are dynamic and can be configured through Dashboard Settings or by dragging widgets in Admin Mode.`
      },
      { 
        path: '/information/about', 
        description: 'Application information and technology stack.',
        responseBody: `Presents details about the fireCNC application, including its version, author, contact information, a brief description, and the core technologies used in its development (Angular, Signals, Tailwind CSS, WebSockets).`
      },
      { 
        path: '/information/changelog', 
        description: 'Application change log.',
        responseBody: `Displays a markdown-formatted history of application updates and new features, with entries organized by date.`
      },
      { 
        path: '/information/hardware', 
        description: 'Hub for hardware module documentation.',
        responseBody: `A hub page listing various hardware modules integrated with fireCNC, such as the Waveshare ESP32 controller, RS485 to Ethernet converter, RS485 Hub, and Modbus RTU Analog Input module. Each module is a clickable link to its detailed documentation.`
      },
      { 
        path: '/information/hardware/esp32-s3-poe', 
        description: 'Waveshare ESP32 reference and notes.',
        responseBody: `Displays a detailed diagram of the Waveshare ESP32-S3-POE-ETH-8DI-8DO board, its categorized GPIO pinout, and markdown-formatted module notes explaining its key features and usage.`
      },
      { 
        path: '/information/hardware/rs485-hub', 
        description: 'Documentation for Waveshare RS485 HUB module.',
        responseBody: `Presents a diagram and markdown-formatted notes for the Waveshare RS485 HUB module, highlighting its key features as an industrial 4-channel RS485 hub and its function as a signal repeater/amplifier.`
      },
      { 
        path: '/information/hardware/rs485-to-ethernet', 
        description: 'Documentation for Waveshare RS485 to Ethernet module.',
        responseBody: `Displays a diagram and markdown-formatted notes for the Waveshare RS485 to Ethernet module, detailing its key features and role as a serial-to-Ethernet adapter in the fireCNC system.`
      },
      { 
        path: '/information/hardware/waveshare-rs485-io-analog', 
        description: 'Documentation for Waveshare Modbus RTU Analog Input 8ch module.',
        responseBody: `Shows a diagram and markdown-formatted notes for the Waveshare Modbus RTU Analog Input 8ch module, describing its 8-channel analog input capabilities, isolated RS485 interface, and industrial-grade features.`
      },
      { 
        path: '/information/help', 
        description: 'Application help guide.',
        responseBody: `Offers an accordion-style list of help topics, each providing a detailed markdown-formatted explanation of different application features and functionalities (e.g., Dashboard, Admin Mode, Settings, Logs).`
      },
      { 
        path: '/information/landing', 
        description: 'Mobile/tablet optimized information overview.',
        responseBody: `A mobile-friendly landing page presenting a list of links to various information categories (About, Help, Logic, Hardware, Software, Routes & Endpoints) with descriptions.`
      },
      { 
        path: '/information/logic', 
        description: 'Detailed explanation of system logic.',
        responseBody: `Explains the internal workings and decision-making processes of the fireCNC system through markdown-formatted sections, covering topics like system startup, connectivity, watchdog timers, LED and servo control logic, SNMP integration, and shutdown/reboot procedures.`
      },
      { 
        path: '/information/recipe', 
        description: 'View the application rebuild prompt.',
        responseBody: `Displays the full rebuild prompt for the application.`
      },
      { 
        path: '/information/software', 
        description: 'Software versions and update status.',
        responseBody: `Shows current versions and release dates for the controller firmware and web application, along with GitHub update statuses. It also lists core components and third-party libraries used in both the UI and Arduino firmware.`
      },
      { 
        path: '/information/software/firmware-browser', 
        description: 'Browse and edit simulated controller firmware source.',
        responseBody: `Offers a file browser for simulated C++ firmware source files (.ino, .h, .cpp) and an interactive CodeMirror editor to view and modify their content. Changes can be saved to the simulated file system.`
      },
      { 
        path: '/leds', 
        description: 'Control and visualize LED strips.',
        responseBody: `Provides controls for LED strip power, brightness, color, and various visual effects (Solid, Rainbow, Chase, Off). It also includes separate controls for the onboard LED and a live visualization of the LED strip states.`
      },
      { 
        path: '/linuxcnc-mpg', 
        description: 'LinuxCNC specific MPG pendant interface.',
        responseBody: `Provides a specialized interface for a LinuxCNC-compatible MPG, featuring a jog dial (with drag-to-spin and keyboard shortcuts), axis selection, step size configuration, feed/spindle overrides, and spindle controls. It displays simulated machine and work coordinates.`
      },
      { 
        path: '/mpg', 
        description: 'Generic MPG pendant interface.',
        responseBody: `A placeholder page indicating the presence of a generic MPG (Manual Pulse Generator) module interface, ready for customization or specialized implementation.`
      },
      { 
        path: '/settings/dashboard', 
        description: 'Customize dashboard widget layout.',
        responseBody: `Provides an interface to customize the main dashboard layout. Users can drag and drop enabled widgets between two columns, toggle their visibility, and reset the layout to default settings. It also includes configuration for external analog input modules.`
      },
      { 
        path: '/settings/expansion', 
        description: 'Manage installed and available expansion modules.',
        responseBody: `Displays a list of currently installed expansion modules, allowing users to uninstall them or add new modules from a list of available definitions. It also provides links to create new module JSON definitions and edit individual module port configurations.`
      },
      { 
        path: '/settings/expansion/create', 
        description: 'Form to create new module JSON definitions.',
        responseBody: `Presents a form for creating new expansion module JSON definitions. Users can specify module name, version, author, function (e.g., IO, Relay, MPG), protocol, description, URLs, and define individual ports with their specific properties and validators based on the module's function.`
      },
      { 
        path: '/settings/expansion/:moduleId/port/:portIndex/edit', 
        description: 'Edit a specific port of an installed module.',
        responseBody: `A form dedicated to editing the configuration of a specific port within an installed expansion module. The available fields and their validation dynamically adjust based on the module's function and protocol.`
      },
      { 
        path: '/settings/general', 
        description: 'General system, watchdog, and security settings.',
        responseBody: `A comprehensive form with collapsible sections for configuring core system parameters such as SSH, Watchdog timers (system and ICMP), SD card failure actions, software update checks, general system settings (e.g., WebSocket port, buzzer, text selection), and security settings (admin access code).`
      },
      { 
        path: '/settings/landing', 
        description: 'Mobile/tablet optimized settings overview.',
        responseBody: `A mobile-friendly landing page presenting a list of links to various settings categories (General, Network, Dashboard, Onboard I/O, Expansion, Cloud Sync, Advanced) with descriptions, and includes direct links for Admin-only system actions like Shell and Reboot.`
      },
      { 
        path: '/settings/network', 
        description: 'Network and SNMP configuration.',
        responseBody: `A form for configuring network settings, including Ethernet static IP, gateway, DNS, and NTP servers. It also manages Wi-Fi modes (Disabled, Station, Access Point) with associated SSID, password, DHCP client/server, and static IP settings. Additionally, it contains a dedicated section for SNMP agent and trap configurations.`
      },
      { 
        path: '/settings/onboard', 
        description: 'Configure onboard digital I/O names and visibility.',
        responseBody: `Allows users to rename and enable/disable each of the 8 onboard digital outputs and 8 digital inputs. It also includes editable titles for the Digital Outputs and Digital Inputs widgets displayed on the dashboard.`
      },
      { 
        path: '/status', 
        description: 'System status and SNMP OID data.',
        responseBody: `Provides a detailed overview of various system metrics exposed via the simulated SNMP agent, including health (voltage, temperature), storage usage (SD card, SRAM, EEPROM), servo positions and limits, and digital/analog I/O states. It allows toggling the display of SNMP OIDs for each metric.`
      },
      { 
        path: '/status-details/:type', 
        description: 'Detailed status for Internet, ESP32, or LinuxCNC connections.',
        responseBody: `Displays detailed information about a specific connection type (Internet, ESP32, or LinuxCNC), including its current status, description, and last successful connection timestamp. For Internet status, it also shows ping configuration (enabled, target, last success).`
      },
      { 
        path: '/system/advanced', 
        description: 'Access to raw config and file editors.',
        responseBody: `Serves as a gateway to advanced management tools, providing links to editors for the raw configuration file (config.json), changelog, reference content, and simulation controls.`
      },
      { 
        path: '/system/advanced/changelog-editor', 
        description: 'Edit changelog markdown content.',
        responseBody: `Provides a textarea editor for directly modifying the application's changelog markdown content. Changes can be saved to the simulated log file.`
      },
      { 
        path: '/system/advanced/config-editor', 
        description: 'Edit raw firecnc.conf file content.',
        responseBody: `Offers a CodeMirror editor for direct editing of the raw firecnc.conf file content. It highlights JSON syntax and provides options to save changes or revert to the last saved state.`
      },
      { 
        path: '/system/advanced/reference-editor', 
        description: 'Edit GPIO reference markdown content.',
        responseBody: `Offers a textarea editor for directly modifying the markdown content displayed on the GPIO Reference page. Changes can be saved to the simulated file.`
      },
      { 
        path: '/system/advanced/simulation', 
        description: 'Simulation controls for device behaviors.',
        responseBody: `Offers a panel of controls to simulate various device behaviors, including WebSocket connection states, SD card failures, SNMP traps, temperature fluctuations, internet connectivity (online/offline, ping enable), LinuxCNC connection states, and buzzer tests. It also displays current simulated statuses.`
      },
      { 
        path: '/system/modules', 
        description: 'Edit raw JSON definitions for expansion modules.',
        responseBody: `Presents a file browser for module definition JSON files and an interactive CodeMirror editor to view and modify their content. Changes can be saved to the simulated file system.`
      },
      { 
        path: '/system/shell', 
        description: 'Interactive command-line shell.',
        responseBody: `Presents a terminal-like interface allowing users to execute simulated commands (e.g., ls, cat, cd, reboot) on the device's virtual file system. Command history and output are displayed.`
      },
    ].sort((a, b) => a.path.localeCompare(b.path)),
  };

  openEndpointPath: string | null = null;

  toggleExamplePanel(endpoint: Endpoint): void {
    if (this.openEndpointPath === endpoint.path) {
      this.openEndpointPath = null;
    } else {
      this.openEndpointPath = endpoint.path;
    }
  }

  parseMarkdown(content: string): SafeHtml {
    return this.markdownService.parse(content);
  }
}