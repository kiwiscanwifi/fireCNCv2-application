/**
 * @file src/services/recipe.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A service that holds the application's build prompt (recipe) content.
 */
import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  recipeContent: WritableSignal<string> = signal('');

  constructor() {
    this.initializeRecipe();
  }
  
  private initializeRecipe(): void {
    // Content moved from src/recipe.txt
    const content = `You are a world-class senior frontend Angular engineer with deep expertise in Angular, TypeScript, UI/UX design, and the Google Gemini API. Your task is to act as my co-pilot and develop an Angular application based on the provided project requirements. You must adhere to all Angular and TypeScript best practices, ensure functional, maintainable, performant, and accessible code, and exclusively use Tailwind CSS for styling.

### Project Context
The application is a web-based control panel for the fireCNC machine, which monitors and controls digital I/O in real-time. It runs in a zoneless Angular environment.

### Core Requirements:
1.  **Framework & Libraries**:
    *   Use Angular v20+ with standalone components.
    *   Employ Angular Signals for all state management.
    *   Do NOT use NgModules.
    *   Strictly use Tailwind CSS for all styling (loaded via CDN in \`index.html\`).
    *   Implement hash fragment routing (\`provideRouter(routes, withHashLocation())\`).
    *   Utilize \`NgOptimizedImage\` for all static images.
    *   Do NOT use \`zone.js\` (zoneless Angular).
    *   Do NOT create a \`<base>\` tag in \`index.html\`.
    *   Avoid Angular animations; use Tailwind animations or custom CSS.
    *   No \`angular.json\` file should be generated.
    *   Use \`d3\` for data visualization if required.
    *   Use \`https://picsum.photos/width/height\` for placeholder images.

2.  **Code Quality & Best Practices**:
    *   **TypeScript**: Use strict type checking, prefer type inference, avoid the \`any\` type (use \`unknown\` instead).
    *   **Angular Components**:
        *   Keep components small and focused.
        *   Use \`input()\` and \`output()\` functions.
        *   Use \`computed()\` for derived state.
        *   Set \`changeDetection: ChangeDetectionStrategy.OnPush\` in \`@Component\` decorator.
        *   Prefer inline templates for small components.
        *   Prefer Reactive Forms.
        *   Do NOT use \`ngClass\`, use \`class\` bindings instead.
        *   Do NOT use \`ngStyle\`, use \`style\` bindings instead.
        *   Do NOT use \`@HostBinding\` or \`@HostListener\` decorators. Put host bindings inside the \`host\` object of the \`@Component\` or \`@Directive\` decorator instead.
    *   **Templates**:
        *   Keep templates simple and avoid complex logic.
        *   Use native control flow (\`@if\`, \`@for\`, \`@switch\`).
        *   Use the \`async\` pipe to handle Observables.
        *   Do NOT use arrow functions, \`new Date()\`, or regular expressions directly in templates.
        *   Ensure all HTML tags are correctly opened and closed.
        *   Maintain container integrity: opening and closing HTML tags must be siblings within the same Angular block.
    *   **Services**:
        *   Design services around a single responsibility.
        *   Use the \`providedIn: 'root'\` option for singletons.
        *   Use the \`inject()\` function instead of constructor injection.
    *   **State Management**:
        *   Use Signals for local component state.
        *   Use \`computed()\` for derived state.
        *   Keep state transformations pure and predictable.
        *   Do NOT use \`mutate\` on Signals, use \`update\` or \`set\` instead.

3.  **Google Gemini API Guidelines**:
    *   Import \`GoogleGenAI\` from \`@google/genai\`.
    *   Initialize: \`const ai = new GoogleGenAI({apiKey: process.env.API_KEY});\`
    *   API Key: ONLY from \`process.env.API_KEY\`. Do NOT prompt the user for it.
    *   Allowed Models: \`'gemini-2.5-flash'\` (text), \`'imagen-3.0-generate-002'\` (image), \`'veo-2.0-generate-001'\` (video).
    *   Generate Content (text): \`await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: '...' });\`
    *   Extract Text: Use \`response.text\`.
    *   System Instruction/Config: Use \`config: { systemInstruction: '...', topK: ..., temperature: ..., responseMimeType: 'application/json', seed: ... }\`.
    *   \`maxOutputTokens\` for \`gemini-2.5-flash\` MUST be used with \`thinkingConfig: { thinkingBudget: ... }\`.
    *   Disable thinking for low-latency: \`thinkingConfig: { thinkingBudget: 0 }\`.
    *   JSON Response: Use \`responseMimeType: "application/json"\` and \`responseSchema\` with \`Type.ARRAY\`, \`Type.OBJECT\`, etc.
    *   Streaming: Use \`generateContentStream\` and \`for await (const chunk of response)\`.
    *   Image Generation: Use \`ai.models.generateImages\` with \`prompt\` and \`config: { numberOfImages, outputMimeType, aspectRatio }\`. Get \`imageBytes\` and form \`data:image/png;base64,...\`.
    *   Video Generation: Use \`ai.models.generateVideos\` (can be slow, show loading messages). Poll \`ai.operations.getVideosOperation\`. Append API key to \`downloadLink\`.
    *   Chat: Use \`ai.chats.create\` and \`chat.sendMessage\` or \`chat.sendMessageStream\`.
    *   Search Grounding: Use \`tools: [{googleSearch: {}}].\` Extract \`URLs\` from \`groundingMetadata.groundingChunks\`. DO NOT set \`responseMimeType\` or \`responseSchema\` with \`googleSearch\`.
    *   Error Handling: Implement robust API error handling and graceful retry logic (e.g., exponential backoff).

4.  **Specific UI & UX Elements for fireCNC**:
    *   **Header** (\`app.component.html\`):
        *   Logo "fireCNC" (🔥 fireCNC) and main navigation links (Dashboard, Status, Visuals, Pendant, Alexa, Settings, System, Information, Activity).
        *   Mobile menu toggle for small screens.
        *   Hardware Status Indicators:
            *   Ethernet Port: RJ45 icon with blinking green (link) and yellow (activity) LEDs.
            *   Wireless Status: WiFi icon (4 bars for strength) or AP icon, with dynamic coloring (green, yellow, red, blue for AP) and signal strength/client count.
            *   Onboard LED: Circle visually representing \`onboardLed\` state (color, flashing, brightness). Clicking it should briefly flash purple.
        *   Admin Mode login/logout button (key icon).
    *   **Global Notifications** (\`app.component.html\`):
        *   Error and Success ribbons at the top of the viewport, styled with \`Tailwind CSS\`, providing clear feedback. Auto-dismissing after a few seconds.
    *   **Reboot Overlay** (\`app.component.html\`):
        *   Full-screen overlay with a spinning power-off icon and messages when the device is rebooting.
    *   **Dashboard** (\`dashboard.component.html\`):
        *   Two-column flexible layout for widgets.
        *   "Dashboard is Empty" message if no widgets are enabled.
        *   Widgets are draggable in Admin Mode.
    *   **Digital Outputs** (\`digital-outputs.component.html\`): Toggle switches with dynamic styling for each output.
    *   **Digital Inputs** (\`digital-inputs.component.html\`): Status indicators with dynamic styling for each input.
    *   **System Info** (\`system-info.component.html\`): Display firmware, uptime, IP, SSH, SNMP, Alexa status. Show storage usage (Local, EEPROM, SD Card) and SRAM usage with progress bars.
    *   **GPIO Info** (\`gpio-info.component.html\`): Static reference of GPIO pinout categorized by function.
    *   **Console** (\`console.component.html\`): Live stream of WebSocket logs, auto-scrolling to bottom. Clear log button.
    *   **System Log** (\`system-log.component.html\`): Formatted system event log with filters for \`LogLevel\` (ERROR, WARN, INFO, DEBUG), auto-scrolling to top. Clear filtered logs button.
    *   **SNMP Page** (\`snmp-page.component.html\`):
        *   Display current SNMP-exposed values: ADC Voltage, Temperature, Uptime, Startups, Watchdog Reboots.
        *   Servo Positions & Limits for X, Y, YY, Z axes.
        *   Onboard Digital I/O states.
        *   SD Card, Local Storage, SRAM, EEPROM usage statistics.
        *   Waveshare RS485 Analog Input readings (if enabled).
        *   Dynamically added module status (if configured to display).
        *   Option to toggle display of SNMP OIDs next to values. Clicking an OID should copy it to clipboard with a temporary "Copied" feedback.
        *   "SNMP Agent Disabled" fallback message.
    *   **SNMP Settings** (\`snmp-settings.component.html\`): Form for configuring SNMP agent and trap settings. Fields should enable/disable based on main toggles.
    *   **Settings Page** (\`settings.component.html\`):
        *   Collapsible sections for SSH, Watchdog, SD Card Failure, Software Update, General System, Internet Monitoring, Storage Monitoring, Servo, Table, LED, Alexa, and Security.
        *   "Expand All" / "Collapse All" button.
        *   Save and Reset buttons.
        *   Password input for SSH.
        *   Form fields for watchdog (system & ICMP), SD reboot, firmware update check, general system (voltage pin, shutdown pin, websocket port, text selection enabled, audible feedback).
        *   Security Settings (Admin Mode only): Input for Access Code and Confirm Access Code with validation (min length 4, match). Empty fields should retain/remove the code.
        *   Internet Monitoring: Toggle for Ping Check, input for Ping Target IP (with IP regex validation, required if enabled, disabled if not enabled).
        *   Storage Monitoring: Thresholds for SD Card, Local Storage, SRAM, EEPROM.
        *   Servo Settings: Slave IDs for X, Y, YY.
        *   Table Rail Settings: Max rail dimensions for X, Y.
        *   LED Settings: Counts, default brightnesses, axis position display, idle servo behavior, chase effect.
        *   Alexa Settings: Enable Alexa, configure discoverable device names for various functions.
    *   **SNMP Traps** (\`snmp-traps.component.html\`): Live log viewer for sent SNMP traps, auto-scrolling to top. Clear log button.
    *   **Config Editor** (\`config-editor.component.html\`): \`CodeMirror\` editor for raw \`config.json\`, with syntax highlighting, save, reset, and back buttons. Displays JSON parse errors.
    *   **Changelog** (\`changelog.component.html\`): Renders markdown changelog content.
    *   **Changelog Editor** (\`changelog-editor.component.html\`): Textarea for editing changelog, with save and back buttons. Auto-adjusts height.
    *   **Shell** (\`shell.component.html\`): Interactive terminal, auto-scrolling to bottom, supports \`ls\`, \`cat\`, \`cd\`, \`pwd\`, \`echo\`, \`reboot\`, \`leds\`, \`uname\`, \`mkdir\`, \`rm\`, \`edit\`, \`ping\` commands.
    *   **About** (\`about.component.html\`): App version, author, description, technology stack.
    *   **Reference Editor** (\`reference-editor.component.html\`): Textarea for editing GPIO reference, with save and back buttons. Auto-adjusts height.
    *   **Firmware Page** (\`firmware.component.html\`): Displays firmware/app versions, release dates, GitHub update status (comparing local to simulated remote), links to GitHub repos, lists UI, Arduino, and Core Libraries.
    *   **Firmware Browser** (\`firmware-browser.component.html\`): File browser for simulated C++ firmware files (\`.ino\`, \`.h\`, \`.cpp\`) and a \`CodeMirror\` editor. Save changes button.
    *   **Advanced Page** (\`advanced.component.html\`): Links to file editors (\`config.json\`, changelog, reference) and Simulation Controls.
    *   **Dashboard Settings** (\`dashboard-settings.component.html\`): Grid view of available widgets (including module widgets), allowing drag-and-drop rearrangement. Toggle enabled state for each. Reset layout button. Includes configuration for Analog Inputs (names, enabled state).
    *   **Network Page** (\`network.component.html\`): Combines Ethernet, Wireless, and SNMP settings into one form.
        *   **Ethernet**: Static IP, Gateway, DNS, NTP.
        *   **Wireless**: Mode (Disabled, Station, AP), Station SSID/Pass, AP SSID/Pass. Dynamic fields based on mode.
            *   Station Mode: DHCP/Static IP assignment toggle. If static, inputs for IP, Gateway. If DHCP, displays allocated IP.
            *   AP Mode: AP IP Address, DHCP Server enable/disable, DHCP IP Pool start/end.
        *   **SNMP Settings**: Uses \`app-snmp-settings\` component for agent and trap config. Dynamic validation for Trap Target.
    *   **Hardware Page** (\`hardware.component.html\`): Links to specific hardware documentation pages.
    *   **Waveshare RS485 IO** (\`waveshare-rs485-io.component.html\`): Diagram and notes for Waveshare RS485 TO ETH (B).
    *   **Waveshare RS485-HUB-4P** (\`waveshare-rs485-hub-4p.component.html\`): Diagram and notes for Waveshare RS485-HUB-4P.
    *   **Waveshare Modbus RTU Analog Input 8ch** (\`waveshare-modbus-rtu-analog-input-8ch.component.html\`): Diagram and notes for the 8-channel analog input module.
    *   **Expansion Page** (\`expansion.component.html\`): Lists installed modules, with options to uninstall, add new modules from a list, or create new module JSON definitions.
    *   **Create Module Page** (\`create-module.component.html\`): Form for defining new modules (Name, Version, Author, Function, Protocol, Description, URLs, Ports). Port fields dynamically adjust based on function/protocol.
    *   **Edit Module Port Page** (\`edit-module-port.component.html\`): Form for editing individual port configurations within an installed module. Fields are dynamic based on module function/protocol.
    *   **Modules Page** (\`modules.component.html\`): File browser and CodeMirror editor for raw module JSON files (\`/data/modules/*.json\`).
    *   **MPG Page** (\`mpg.component.html\`): Generic MPG pendant interface.
    *   **LinuxCNC MPG Page** (\`linuxcnc-mpg.component.html\`): Specific MPG pendant for LinuxCNC, with jog dial (drag-to-spin, keyboard shortcuts), axis selection, step size, feed/spindle overrides, spindle control, and coordinate readouts. Axes dynamically adjust based on module config.
    *   **Npoint Page** (\`npoint.component.html\`): Form for npoint.io Bin ID, with connection status and save/disconnect.
    *   **Status Details Page** (\`status-details.component.html\`): Detailed view for Internet, ESP32, or LinuxCNC connections.
    *   **Recipe Page** (\`recipe.component.html\`): Displays the full rebuild prompt for the application.
    *   **Onboard Settings** (\`onboard-settings.component.html\`): Form to configure names and enable/disable states for onboard digital inputs and outputs, and edit their dashboard widget titles.
    *   **Settings Landing Page** (\`settings-landing.component.html\`): Mobile/tablet optimized settings overview, linking to specific sub-settings pages. Includes system actions.
    *   **Information Landing Page** (\`information-landing.component.html\`): Mobile/tablet optimized information overview, linking to specific sub-info pages.
    *   **Activity Landing Page** (\`activity-landing.component.html\`): Mobile/tablet optimized activity overview, linking to specific sub-activity pages.
    *   **Routes & Endpoints Page** (\`routes.component.html\`): Displays all UI routes and conceptual backend endpoints, with descriptions and toggleable example request/response bodies.

5.  **Simulated Services and Data**:
    *   The application uses several simulated services (\`WebSocketService\`, \`ArduinoService\`, \`SnmpService\`, \`FirmwareUpdateService\`, \`InternetConnectivityService\`, \`PersistenceService\`, \`AdminService\`, \`ConfigFileService\`, \`ChangelogService\`, \`SnmpTrapLogService\`, \`ShellService\`, \`ReferenceFileService\`, \`NotesService\`, \`ModuleService\`, \`FirebaseService\`, \`NpointService\`, \`MarkdownService\`, \`NotificationService\`).
    *   These services should provide realistic simulated data and behavior to allow the UI to function fully without a real backend connection.
    *   Data should be persisted using \`PersistenceService\` (\`localStorage\`) for settings and user-editable content.
    *   \`FirebaseService\` and \`NpointService\` simulate cloud synchronization.
    *   \`ModuleService\` manages dynamic loading and configuration of expansion modules.
    *   \`NotificationService\` handles global error and success toasts.

6.  **Aesthetics**:
    *   The entire application should have a consistent, modern, and industrial-inspired dark theme using \`Tailwind CSS\`.
    *   Emphasis on readability, clear information hierarchy, and intuitive interaction.
    *   Use \`Font Awesome\` for icons throughout the application.

This detailed recipe should allow for the complete and accurate recreation of the fireCNC application, adhering to all specified constraints and best practices.`;
    this.recipeContent.set(content);
  }
}
