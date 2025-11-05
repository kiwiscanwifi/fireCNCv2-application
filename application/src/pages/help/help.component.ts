/**
 * @file src/pages/help/help.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Help page, providing a user guide for the application.
 */
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface HelpTopic {
  title: string;
  icon: string;
  content: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-help',
  imports: [CommonModule],
  templateUrl: './help.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpComponent {
  topics = signal<HelpTopic[]>([
    {
      title: 'Dashboard',
      icon: 'fa-solid fa-chart-line',
      content: `
        <p>The main overview of your fireCNC device. The layout of this page is fully customizable via <strong>Settings > Dashboard Settings</strong>.</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>Digital Outputs:</strong> Allows you to manually toggle the 8 digital outputs (relays) on the board.</li>
          <li><strong>Digital Inputs:</strong> Shows the real-time status (HIGH/LOW) of the 8 digital inputs and their corresponding GPIO pin numbers.</li>
          <li><strong>System Details:</strong> Displays critical system information, including firmware version, uptime, and IP address.</li>
          <li><strong>Storage Info:</strong> Shows usage for the SD card, local browser storage, and EEPROM.</li>
          <li><strong>SRAM Info:</strong> Displays the current SRAM usage.</li>
        </ul>
      `,
      isOpen: true,
    },
    {
      title: 'Status (SNMP)',
      icon: 'fa-solid fa-network-wired',
      content: `
        <p>This page displays detailed system metrics that are exposed via the simulated SNMP agent. It's a raw view of the data an SNMP manager would see.</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>System Health:</strong> Shows voltage, temperature, uptime, and reboot counters.</li>
          <li><strong>Storage Cards:</strong> Provides detailed usage statistics for Local Storage, SD Card, SRAM, and EEPROM. Each value corresponds to a specific SNMP OID.</li>
          <li><strong>Servos:</strong> Displays the current position and limit switch status for each servo motor.</li>
        </ul>
      `,
      isOpen: false,
    },
    {
      title: 'LEDs',
      icon: 'fa-solid fa-lightbulb',
      content: `
        <p>Control the connected WS2815 LED strips and the onboard LED.</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>LED Strip Control:</strong> Manage power, brightness, color, and apply effects like Rainbow or Chase to all main LED strips simultaneously.</li>
          <li><strong>Onboard LED Control:</strong> Separately control the power, brightness, and color of the small LED integrated on the ESP32 board.</li>
          <li><strong>Live Visualization:</strong> Shows a real-time, sampled representation of the colors and brightness on each LED strip.</li>
        </ul>
      `,
      isOpen: false,
    },
    {
      title: 'Alexa',
      icon: 'fa-brands fa-amazon',
      content: `
        <p>Simulates integration with Amazon Alexa for voice control.</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>Enable/Disable:</strong> Turn the entire Alexa integration on or off.</li>
          <li><strong>Discovered Devices:</strong> A list of virtual devices that Alexa can "discover." You can use the controls here to simulate commands from Alexa, such as turning on the buzzer or changing an LED's brightness.</li>
          <li><strong>Announcements Log:</strong> Shows a history of announcements the device has made, such as on startup.</li>
        </ul>
      `,
      isOpen: false,
    },
    {
      title: 'Settings',
      icon: 'fa-solid fa-sliders',
      content: `
        <p>Configure all aspects of the fireCNC device. Changes are saved to a simulated <code>config.json</code> file.</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>General Settings:</strong> Configure System, Network, Storage Monitoring, Servos, LEDs, Alexa, and SNMP settings.</li>
          <li><strong>Dashboard Settings:</strong> Customize the layout of the main dashboard by dragging, dropping, and toggling widgets.</li>
          <li><strong>Advanced Configuration:</strong> Allows you to directly edit the raw configuration, changelog, and reference files.</li>
        </ul>
      `,
      isOpen: false,
    },
    {
      title: 'System Dropdown',
      icon: 'fa-solid fa-gears',
      content: `
        <p>Provides access to system-level information and tools.</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>Shell:</strong> A simulated command-line interface for interacting with the device's file system. Try commands like <code>ls</code>, <code>cat /etc/firecnc.conf</code>, and <code>help</code>.</li>
          <li><strong>Logic:</strong> A detailed technical explanation of how the application's core systems function.</li>
          <li><strong>Help:</strong> You are here!</li>
          <li><strong>Other Pages:</strong> Includes links to About, Firmware, Dependencies, Hardware (GPIO), Change Log, and the Reboot function.</li>
        </ul>
      `,
      isOpen: false,
    },
    {
      title: 'Activity Dropdown',
      icon: 'fa-solid fa-chart-area',
      content: `
        <p>View real-time logs and activity from the device.</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>Console Output:</strong> A raw, unfiltered stream of all messages coming from the device over the WebSocket connection.</li>
          <li><strong>System Log:</strong> A formatted, color-coded log of important system events, like startups, errors, and warnings.</li>
          <li><strong>SNMP Traps Sent:</strong> A log of every SNMP trap notification that the device has sent, which is useful for debugging monitoring setups.</li>
        </ul>
      `,
      isOpen: false,
    }
  ]);

  toggleTopic(topicToToggle: HelpTopic): void {
    this.topics.update(currentTopics => 
      currentTopics.map(topic => 
        topic.title === topicToToggle.title 
          ? { ...topic, isOpen: !topic.isOpen }
          : topic
      )
    );
  }
}