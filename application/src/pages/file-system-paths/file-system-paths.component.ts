import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from '../../services/markdown.service';

interface Endpoint {
  path: string;
  method?: string;
  description: string;
  requestBody?: string;
  responseBody?: string;
}

interface EndpointCategory {
  title: string;
  icon: string;
  endpoints: Endpoint[];
}

@Component({
  selector: 'app-file-system-paths',
  imports: [CommonModule, RouterLink],
  templateUrl: './file-system-paths.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileSystemPathsComponent {
  private markdownService = inject(MarkdownService);

  fileSystemCategory: EndpointCategory = {
    title: 'Simulated File System Paths (Shell & Editors)',
    icon: 'fa-solid fa-folder-open',
    endpoints: [
        {
          path: '/etc/firecnc.conf',
          description: 'The main configuration file for the device, stored in JSON format.',
          responseBody: JSON.stringify({
            LOG: { SNMP_TRAP: '/logs/snmp_trap.log' },
            SNMP: { TRAP_TARGET: '0.0.0.0', TRAPS_ENABLED: true, AGENT_ENABLED: true },
            SYSTEM: { WATCHDOG: true, WEBSOCKET_PORT: 80, ACCESS_CODE: '0000' }
          }, null, 2)
        },
        {
          path: '/logs/changelog.log',
          description: 'Markdown file containing the application\'s change log entries.',
          responseBody: `### 2024-08-08
- **New Feature**: Added Routes & Endpoints page.
- **Improvement**: Enhanced UI interactivity.`
        },
        {
          path: '/logs/snmp_trap.log',
          description: 'Log file recording all simulated SNMP traps sent by the device.',
          responseBody: `2024-08-08T12:05:01Z | INFO Detected: SD Card initialized and mounted successfully.
2024-08-08T12:10:15Z | WARN Detected: High Storage Usage: SD Card usage is at 85.0%`
        },
        {
          path: '/logs/system.log',
          description: 'Main system event log file, containing messages with different severity levels.',
          responseBody: `2024-08-08T12:00:00Z [INFO] System startup detected. Reason: Normal Power-Up.
2024-08-08T12:00:05Z [DEBUG] ICMP Ping to 192.168.1.1: Success.
2024-08-08T12:01:30Z [WARN] Failed to connect to NTP server time.google.com.`
        },
        {
          path: '/data/pages/reference.txt',
          description: 'Markdown file for GPIO reference notes and hardware-specific information.',
          responseBody: `### Network Connection Logic
Connects to **Ethernet** if the link is up. If not up, tries **Wi-Fi** connection. If no Wi-Fi connection, falls back to a static IP of \`192.168.1.20\` for the Ethernet.`
        },
        {
          path: '/home/user/notes.txt',
          description: 'User-editable scratchpad for personal notes.',
          responseBody: `# My Notes

- Remember to check the servo limits.`
        },
        {
          path: '/data/modules/*.json',
          description: 'JSON definition files for expansion modules, specifying their functionality and ports.',
          responseBody: JSON.stringify({
            moduleName: 'Waveshare RS485 8ch Relay',
            author: 'Mark Dyer',
            version: '1.0.0',
            function: 'Relay',
            protocol: 'MODBUS RTU',
            ports: [{ name: 'Relay 1', enabled: true, portReference: 1 }]
          }, null, 2)
        },
        { path: 'firmware/*.cpp', description: 'Simulated C++ source code files for the device firmware.' },
        { path: 'firmware/*.h', description: 'Simulated C++ header files for the device firmware.' },
        { path: 'firmware/*.ino', description: 'Simulated Arduino sketch file for the device firmware.' },
    ],
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
