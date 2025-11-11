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
import { RouterLink } from '@angular/router';

interface HelpTopic {
  title: string;
  icon: string;
  content: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-help',
  imports: [CommonModule, RouterLink],
  templateUrl: './help.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpComponent {
  topics = signal<HelpTopic[]>([
    {
      title: 'Dashboard',
      icon: 'fa-solid fa-chart-line',
      content: `
        <p>The main overview of your fireCNC device. The layout of this page is fully customizable via <strong>Settings > Dashboard</strong>. In <strong>Admin Mode</strong>, you can also drag and drop widgets to rearrange the layout directly on this page.</p>
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
      title: 'Admin Mode',
      icon: 'fa-solid fa-user-shield',
      content: `
        <p>Admin Mode unlocks advanced features and settings that are hidden by default to prevent accidental changes. To enter Admin Mode, click the <i class="fa-solid fa-arrow-right-to-bracket"></i> icon in the footer and enter the access code.</p>
        <p class="mt-2">Once enabled, you will see a green "Admin Mode Enabled" indicator in the footer, and the following features become available:</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>Customizable Dashboard:</strong> Drag and drop widgets on the Dashboard to rearrange your layout.</li>
          <li><strong>Advanced Settings:</strong>
            <ul class="list-['-_'] list-inside ml-4 mt-1">
              <li><strong>Cloud Sync:</strong> Sync your configuration with a npoint.io bin.</li>
              <li><strong>Advanced:</strong> Access raw file editors for <code>config.json</code>, the changelog, and other system files.</li>
              <li><strong>Security:</strong> Set or change the Admin Mode access code from the General Settings page.</li>
            </ul>
          </li>
          <li><strong>System Tools:</strong>
            <ul class="list-['-_'] list-inside ml-4 mt-1">
              <li><strong>Shell:</strong> Access a simulated command-line interface for the device.</li>
              <li><strong>Modules:</strong> Edit the raw JSON definitions for expansion modules.</li>
            </ul>
          </li>
        </ul>
        <p class="mt-2">To exit Admin Mode, click the <i class="fa-solid fa-arrow-right-from-bracket"></i> icon in the footer.</p>
      `,
      isOpen: false,
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
        <p>Configure all aspects of the fireCNC device. Changes are saved to a simulated <code>config.json</code> file. See the <strong>Admin Mode</strong> topic for details on advanced settings available in that mode.</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>General Settings:</strong> Configure core system parameters like watchdogs, security, LEDs, and servos.</li>
          <li><strong>Network Settings:</strong> Manage Ethernet, Wi-Fi, and SNMP configurations.</li>
          <li><strong>Dashboard Settings:</strong> Customize which widgets appear on your dashboard.</li>
          <li><strong>Onboard I/O Settings:</strong> Rename and toggle visibility for the 8 digital inputs and 8 digital outputs.</li>
          <li><strong>Expansion Settings:</strong> Add, create, and manage external hardware modules.</li>
        </ul>
      `,
      isOpen: false,
    },
    {
      title: 'System Dropdown',
      icon: 'fa-solid fa-gears',
      content: `
        <p>Provides access to system-level information and tools. See the <strong>Admin Mode</strong> topic for information on advanced tools available in that mode.</p>
        <ul class="list-disc list-inside mt-2 space-y-1">
          <li><strong>About, Software, Change Log:</strong> View information about the application, its firmware, and recent updates.</li>
          <li><strong>Reboot:</strong> Safely restart the fireCNC device.</li>
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