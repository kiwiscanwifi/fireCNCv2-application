import { ChangeDetectionStrategy, Component, signal, WritableSignal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-recipe',
  imports: [CommonModule, DatePipe],
  templateUrl: './recipe.component.html',
  styleUrls: ['./recipe.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeComponent {
  lastUpdated: WritableSignal<Date> = signal(new Date());

  // Split the rebuild prompt into an array of strings to avoid 'Maximum call stack size exceeded'
  // when the content is too large. Each string here is a logical section of the prompt.
  rebuildPromptParts: WritableSignal<string[]> = signal([`
You are a world-class senior frontend Angular engineer with deep expertise in Angular, TypeScript, UI/UX design, and the Google Gemini API. Your task is to act as my co-pilot and develop a sophisticated, real-time web-based control panel named "fireCNC" for an industrial CNC machine.

The application must be built using <b>Angular v20+ with zoneless change detection</b> and <b>TypeScript</b>. For styling, use <b>Tailwind CSS exclusively</b>, loaded via a CDN script in <code>&lt;index.html&gt;</code>. Do NOT generate any Tailwind config files. Use Font Awesome for icons, loaded via CDN.

<b>Core Requirements:</b>

1.  <b>Project Setup:</b>
    *   Initialize a a new <code>Angular</code> application.
    *   Configure zoneless change detection.
    *   Implement hash fragment routing (<code>withHashLocation()</code>).
    *   No <code>angular.json</code> file.
    *   No <code>&lt;base&gt;</code> tag in <code>&lt;index.html&gt;</code>.
    *   No <code>zone.js</code> imports.
    *   Load <code>Tailwind CSS</code> and <code>Font Awesome</code> from CDNs in <code>&lt;index.html&gt;</code>.
    *   Load <code>CodeMirror 5.x</code> for text editing via CDN in <code>&lt;index.html&gt;</code>.
    *   Include <code>Firebase SDKs (v8.10.1)</code> from CDN in <code>&lt;index.html&gt;</code> for future cloud sync features.
    *   Implement an import map for <code>RxJS</code> and <code>Angular</code> packages as provided in the <code>&lt;index.html&gt;</code> file.
    *   Ensure all generated <code>HTML</code>, <code>TS</code>, and <code>CSS</code> files are properly formatted (multiple lines, indentation).
`, `
2.  <b>Overall Application Structure (<code>AppComponent</code>):</b>
    *   The <code>AppComponent</code> will serve as the main layout component, containing a header, main content area (<code>&lt;router-outlet&gt;</code>), and a footer.
    *   It should include global status indicators (<code>WebSocket</code>, <code>Internet</code>, <code>LinuxCNC</code> connection, <code>Onboard LED</code>, <code>WiFi</code> status) and notifications (<code>SNMP Traps</code>, <code>Alexa Announcements</code>, <code>Firmware Updates</code>).
    *   Implement a mobile-friendly responsive navigation that toggles visibility.
    *   Implement a confirmation modal for critical actions like reboot.
    *   The app's version and release date should be displayed in the footer.
    *   The main navigation will be divided into:
        *   <b>Dashboard</b>: Main control panel.
        *   <b>Status</b>: <code>SNMP</code>-related information.
        *   <b>Visuals</b>: <code>LED</code> controls.
        *   <b>Pendant</b>: <code>MPG</code> (Manual Pulse Generator) control.
        *   <b>Alexa</b>: <code>Alexa</code> integration controls.
        *   <b>Settings (Dropdown)</b>: <code>General</code>, <code>Dashboard</code>, <code>Expansion</code>, <code>Network</code>, <code>Cloud Sync</code>, <code>Advanced</code>.
        *   <b>System (Dropdown)</b>: <code>Shell</code>, <code>About</code>, <code>Firmware</code>, <code>Modules</code>, <code>Change Log</code>, <code>Reboot</code>.
        *   <b>Information (Dropdown)</b>: <code>Hardware</code>, <code>Logic</code>, <code>Help</code>, <b><code>Recipe</code></b>.
        *   <b>Activity (Dropdown)</b>: <code>Console Output</code>, <code>System Log</code>, <code>SNMP Traps Sent</code>.
`, `
3.  <b>State Management:</b>
    *   <b>Strictly use <code>Angular Signals</code></b> for all local component state.
    *   Use <code>computed()</code> for derived state.
    *   Avoid the <code>any</code> type; use <code>unknown</code> when type is uncertain.
    *   Use <code>inject()</code> function for service injection.
    *   Set <code>changeDetection: ChangeDetectionStrategy.OnPush</code> for all components.
`, `
4.  <b>Backend Simulation Services:</b>
    *   <b><code>WebSocketService</code></b>: Simulates a <code>WebSocket</code> connection, managing connection status, sending/receiving messages, and logging. It should have <code>connectionStatus: WritableSignal&lt;ConnectionStatus&gt;</code> and <code>logMessages: WritableSignal&lt;string[]&gt;</code>. It should auto-reconnect on disconnects.
    *   <b><code>ArduinoService</code></b>: Simulates the <code>fireCNC</code> controller board. It manages digital <code>I/O</code>, system <code>config</code>, network <code>config</code>, <code>LED</code> state, servo <code>config</code>, health stats, and provides <code>rebootDevice()</code> and <code>shutdownDevice()</code> methods. It includes signals for <code>linuxCncConnectionStatus</code>, <code>onboardLed</code>, <code>buzzerEnabled</code>, <code>sdCardInfo</code>, <code>healthStats</code>, <code>wifiStatus</code>, and <code>isShuttingDown</code>. It also contains internal logic for watchdog timers (hardware and <code>ICMP</code>), <code>SD</code> card error handling, and provides helper methods for status text and color classes.
    *   <b><code>SnmpConfigService</code></b>: Manages <code>SNMP agent</code> and trap configurations. Provides a <code>sendTrap()</code> method to simulate <code>SNMP traps</code> and stores the last notification for <code>UI</code> display.
    *   <b><code>SnmpService</code></b>: Simulates an <code>SNMP agent</code>, providing signals for various system metrics (voltage, temperature, <code>SRAM</code>, <code>EEPROM</code>, analog inputs). It also provides derived signals for usage percentages and fragmentation. It has a method <code>triggerWatchdogReboot()</code>.
    *   <b><code>SystemLogService</code></b>: Simulates a <code>system.log</code> file, providing <code>logEntries: WritableSignal&lt;LogEntry[]&gt;</code> and methods to add/clear logs. It integrates with <code>SnmpConfigService</code> to send traps based on log levels.
    *   <b><code>SnmpTrapLogService</code></b>: Simulates an <code>snmp_trap.log</code> file, storing sent <code>SNMP traps</code> for display.
    *   <b><code>ConfigFileService</code></b>: Centralized management for <code>config.json</code>. It loads/saves configuration from/to <code>localStorage</code> (acting as a persistent file system) and propagates changes to <code>ArduinoService</code>, <code>SnmpConfigService</code>, and <code>DashboardSettingsService</code>. It handles <code>JSON</code> parsing errors.
    *   <b><code>ChangelogService</code></b>: Simulates a <code>changelog.log</code> file, providing <code>changelogEntries: WritableSignal&lt;ChangelogEntry[]&gt;</code> and a <code>saveChangelog()</code> method.
    *   <b><code>ShellService</code></b>: Provides a simulated command-line interface with a basic file system (<code>fs</code>) structure, <code>cwd</code> tracking, and commands like <code>ls</code>, <code>cat</code>, <code>cd</code>, <code>pwd</code>, <code>echo</code>, <code>reboot</code>, <code>leds</code>, <code>mkdir</code>, <code>rm</code>, <code>edit</code>, <code>ping</code>, and <code>uname</code>. It interacts with other services (e.g., <code>ArduinoService</code> for reboot, <code>ConfigFileService</code> for <code>config</code> files).
    *   <b><code>PersistenceService</code></b>: A wrapper around <code>localStorage</code> for persisting data. It also integrates with <code>NpointService</code> for optional cloud sync.
    *   <b><code>ReferenceFileService</code></b>: Manages the content of a markdown file for <code>GPIO</code> reference, supporting editing and persistence.
    *   <b><code>NotesService</code></b>: Manages user notes, persisting them to local storage.
    *   <b><code>ServoControlService</code></b>: Simulates <code>AC servo drivers</code> and manages the state of associated <code>LED strips</code>, including startup animations, error states, idle dimming, and chase effects. It provides <code>servoX</code>, <code>servoY</code>, <code>servoYY</code> signals.
    *   <b><code>AlexaService</code></b>: Simulates <code>Alexa</code> device discovery and control for various board functions (onboard <code>LED</code>, buzzer, master <code>LED strips</code>, shutdown). It includes <code>devices</code> and <code>announcements</code> signals.
    *   <b><code>FirmwareUpdateService</code></b>: Checks for new firmware versions from a <code>GitHub</code> repository (<code>kiwiscanwifi/fireCNCv2</code>).
    *   <b><code>FirmwareFilesService</code></b>: Stores simulated <code>C++</code> firmware source files, allowing browsing and editing.
    *   <b><code>InternetConnectivityService</code></b>: Monitors browser's online/offline status and provides configurable ping checks to a target <code>IP</code>.
    *   <b><code>DashboardSettingsService</code></b>: Manages the customizable dashboard layout, including widget arrangement and individual <code>I/O</code> configuration settings. It provides default layouts and methods to update/reset them.
    *   <b><code>ModuleService</code></b>: Manages "expansion modules" which are <code>JSON</code>-defined hardware configurations. It allows adding/removing module files, installing/uninstalling modules (making them active in the app), and updating their port configurations. It integrates with <code>DashboardSettingsService</code> to add/remove module widgets.
    *   <b><code>MarkdownService</code></b>: A lightweight, internal service to parse a subset of <code>GitHub</code>-flavored markdown into <code>HTML</code>.
`, `
5.  <b>Pages and Components:</b>

    *   <b><code>AppComponent</code></b>: Root component with global layout, navigation, and status indicators.
    *   <b><code>DashboardComponent</code></b>: Displays configurable widgets (<code>Digital Outputs</code>, <code>Digital Inputs</code>, <code>System Details</code>, <code>Storage Info</code>, <code>SRAM Info</code>, <code>Analog Inputs</code>, <code>Module Widgets</code>). Implements drag-and-drop for widget rearrangement.
    *   <b><code>DigitalOutputsComponent</code></b>: Displays configurable digital output toggles.
    *   <b><code>DigitalInputsComponent</code></b>: Displays configurable digital input status.
    *   <b><code>SystemDetailsComponent</code></b>: Shows firmware, uptime, <code>IP</code>, <code>SSH</code>, <code>SNMP</code>, <code>Alexa</code> status.
    *   <b><code>StorageInfoComponent</code></b>: Displays <code>SD</code> card, <code>Local Storage</code>, <code>EEPROM</code> usage.
    *   <b><code>SramInfoComponent</code></b>: Displays <code>SRAM</code> usage.
    *   <b><code>AnalogInputsComponent</code></b>: Displays configurable analog input values.
    *   <b><code>GpioPageComponent</code></b>: Displays a <code>Waveshare ESP32</code> board diagram and <code>GPIO pinout</code>. Includes an editable markdown section via <code>ReferenceFileService</code>.
    *   <b><code>ConsoleComponent</code></b>: Live <code>WebSocket</code> log viewer with auto-scrolling.
    *   <b><code>SystemLogComponent</code></b>: Filterable and color-coded system log viewer.
    *   <b><code>SnmpPageComponent</code></b>: Displays simulated <code>SNMP OID</code> data for system health, storage, servos, and <code>I/O</code>.
    *   <b><code>SnmpSettingsComponent</code></b>: Reusable component for <code>SNMP</code> configuration form, integrated into <code>Settings</code> and <code>Network</code> pages.
    *   <b><code>SnmpTrapsComponent</code></b>: Displays a log of sent <code>SNMP traps</code>.
    *   <b><code>SettingsPageComponent</code></b>: Main settings hub with accordions for various configurations (<code>SSH</code>, <code>Watchdog</code>, <code>SD Card</code>, <code>Firmware Update</code>, <code>General System</code>, <code>Internet Monitoring</code>, <code>Storage Monitoring</code>, <code>Servo &amp; Table</code>, <code>LED</code>, <code>Alexa</code>).
    *   <b><code>ConfigEditorComponent</code></b>: Provides a <code>CodeMirror</code> editor for raw <code>config.json</code> editing.
    *   <b><code>ChangelogComponent</code></b>: Displays application changelog entries.
    *   <b><code>ChangelogEditorComponent</code></b>: Editor for the changelog entries.
    *   <b><code>ShellComponent</code></b>: Interactive terminal interface.
    *   <b><code>AboutComponent</code></b>: Displays application version and technology stack.
    *   <b><code>ReferenceEditorComponent</code></b>: Editor for the <code>GPIO</code> reference markdown.
    *   <b><code>FirmwareComponent</code></b>: Displays details about firmware, <code>UI libraries</code>, core components, and <code>Arduino</code> libraries.
    *   <b><code>LedsPageComponent</code></b>: Controls for <code>LED strips</code> and onboard <code>LED</code>, with a live visualization.
    *   <b><code>AlexaPageComponent</code></b>: <code>UI</code> for simulating <code>Alexa device</code> control and viewing announcements.
    *   <b><code>DependenciesComponent</code></b>: Lists all frontend dependencies.
    *   <b><code>HelpComponent</code></b>: An accordion-style help guide for application features.
    *   <b><code>LogicComponent</code></b>: Explains the system's internal logic and decision-making.
    *   <b><code>FirmwareBrowserComponent</code></b>: Allows browsing and editing simulated <code>C++</code> firmware files using a <code>textarea</code>.
    *   <b><code>AdvancedPageComponent</code></b>: Entry point for raw file editors.
    *   <b><code>DashboardSettingsComponent</code></b>: Dedicated page for configuring dashboard widgets and <code>I/O</code> assignments.
    *   <b><code>NetworkPageComponent</code></b>: Combines network settings and <code>SNMP</code> settings into a single configuration page.
    *   <b><code>HardwarePageComponent</code></b>: Hub for various hardware module documentation (<code>ESP32</code>, <code>RS485 IO</code>, <code>RS485 Hub</code>).
    *   <b><code>WaveshareRs485IoComponent</code></b>: Documentation for the <code>Waveshare RS485 TO ETH (B)</code> module.
    *   <b><code>WaveshareRs485Hub4pComponent</code></b>: Documentation for the <code>Waveshare RS485-HUB-4P</code> module.
    *   <b><code>AddModuleModalComponent</code></b>: Modal for installing new expansion modules.
    *   <b><code>CreateModulePageComponent</code></b>: Form-based creator for new expansion module <code>JSON</code> definitions.
    *   <b><code>ModulesPageComponent</code></b>: Editor for the raw <code>JSON</code> files of expansion modules.
    *   <b><code>EditModulePortComponent</code></b>: Page for editing individual port configurations of an installed module.
    *   <b><code>MpgPageComponent</code></b>: Placeholder for generic <code>MPG</code>.
    *   <b><code>LinuxcncMpgComponent</code></b>: Specialized <code>MPG</code> for <code>LinuxCNC</code>, includes jog dial and overrides.
    *   <b><code>NpointPageComponent</code></b>: Configuration for <code>npoint.io cloud sync</code>.
    *   <b><code>StatusDetailsComponent</code></b>: Detailed status page for <code>Internet</code>, <code>ESP32</code>, or <code>LinuxCNC</code> connections.
    *   <b><code>ConfirmationModalComponent</code></b>: Generic modal for confirming actions.
    *   <b><code>RecipeComponent</code></b>: <b>NEW</b> Page to display the rebuild prompt itself.
`, `
6.  <b>Assets &amp; Styling:</b>
    *   Use <code>https://picsum.photos/width/height</code> for placeholder images.
    *   All images should use <code>NgOptimizedImage</code>.
    *   The <code>style.css</code> file contains custom scrollbar styles and keyframe animations.
    *   The <code>font-awesome.css</code> file points to specific <code>WOFF2</code>/<code>TTF</code> files on <code>GitHub</code>.
    *   Colors: Predominantly dark gray background (<code>bg-gray-900</code>), light gray text (<code>text-gray-200</code>), with accents of orange (<code>text-orange-400</code>, <code>bg-orange-500</code>), green, blue, cyan, yellow, purple, and red for status and interactive elements.
    *   Animations: Use <code>Tailwind's utility classes</code> or simple <code>CSS keyframes</code> for transitions and fades (e.g., toast notifications, loading states).
`, `
7.  <b>Version Management (<code>src/version.ts</code>):</b>
    *   Maintain <code>FIRMWARE_VERSION</code>, <code>APP_VERSION</code>, and <code>APP_RELEASE_DATE</code> in <code>src/version.ts</code> for consistent versioning across the application.
    *   There is also a <code>src/VERSION.json</code> which should be kept in sync with <code>src/version.ts</code>.
`, `
8.  <b>Strict Angular and TypeScript Best Practices:</b>
    *   Adhere to all <code>Angular</code> and <code>TypeScript</code> best practices outlined in the initial prompt, especially regarding <code>signals</code>, <code>OnPush change detection</code>, <code>standalone components</code> (implicitly handled by the prompt, as <code>I shouldn't set standalone: true</code> explicitly), and <code>template syntax</code>.
    *   <b>Critical Error Avoidance:</b> Absolutely no <code>regular expressions</code>, <code>new operators</code>, or <code>arrow functions</code> in templates. Ensure <code>HTML validity</code> and <code>container integrity</code>.
  `]);

  // A computed signal to join the parts back together for display
  rebuildPrompt: WritableSignal<string> = computed(() => this.rebuildPromptParts().join('\n'));
}