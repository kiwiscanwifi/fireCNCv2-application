import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { ConfigFileService } from './config-file.service';
import { ChangelogService } from './changelog.service';
import { SnmpTrapLogService } from './snmp-trap-log.service';
import { SystemLogService } from './system-log.service';
import { ArduinoService, LedEffect } from './arduino.service';
import { ReferenceFileService } from './reference-file.service';
import { NotesService } from './notes.service';
import { ModuleService } from './module.service';

interface FsNode {
  type: 'file' | 'dir';
  content?: string | (() => string); // Direct string for mutable, function for derived/read-only
  contentSetter?: (newContent: string) => boolean; // Function to save content, returns success
  children?: string[]; // Only for directories
}

@Injectable({
  providedIn: 'root',
})
export class ShellService {
  private configFileService = inject(ConfigFileService);
  private changelogService = inject(ChangelogService);
  private snmpTrapLogService = inject(SnmpTrapLogService);
  private systemLogService = inject(SystemLogService);
  private arduinoService = inject(ArduinoService);
  private referenceFileService = inject(ReferenceFileService);
  private notesService = inject(NotesService);
  private moduleService = inject(ModuleService);

  private fs: Record<string, FsNode> = {};
  cwd: WritableSignal<string> = signal('/home/user');

  constructor() {
    this.initializeFileSystem();
  }

  private initializeFileSystem(): void {
    // Helper to create a directory
    const createDir = (path: string, children: string[] = []) => {
      this.fs[path] = { type: 'dir', children };
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
      if (parentPath !== path && this.fs[parentPath]?.children) {
        if (!this.fs[parentPath].children?.includes(path.split('/').pop()!)) {
          this.fs[parentPath].children!.push(path.split('/').pop()!);
        }
      }
    };

    // Helper to create a file
    const createFile = (path: string, content: string | (() => string), contentSetter?: (newContent: string) => boolean) => {
      this.fs[path] = { type: 'file', content, contentSetter };
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/';
      if (parentPath !== path && this.fs[parentPath]?.children) {
        if (!this.fs[parentPath].children?.includes(path.split('/').pop()!)) {
          this.fs[parentPath].children!.push(path.split('/').pop()!);
        }
      }
    };

    // Initialize core directories
    createDir('/');
    createDir('/home');
    createDir('/home/user');
    createDir('/etc');
    createDir('/logs');
    createDir('/data');
    createDir('/data/pages');
    createDir('/data/modules'); // For module files

    // Initialize files mapped to services
    createFile(
      '/etc/firecnc.conf',
      () => this.configFileService.configFileContent(),
      (newContent) => this.configFileService.saveConfig(newContent)
    );
    createFile(
      '/logs/changelog.log',
      () => this.changelogService.changelogEntries(), // Directly get Markdown string
      (newContent) => this.changelogService.saveChangelog(newContent) // Save Markdown string
    );
    createFile(
      '/logs/snmp_trap.log',
      () => this.snmpTrapLogService.trapLogEntries()
        .map(e => `${e.timestamp} | ${e.message}`)
        .join('\n') || 'Log is empty.'
    );
    createFile(
      '/logs/system.log',
      () => this.systemLogService.logEntries()
        .map(e => `${e.timestamp} [${e.level}] ${e.message}`)
        .join('\n') || 'Log is empty.'
    );
    createFile(
      '/data/pages/reference.txt',
      () => this.referenceFileService.referenceContent(),
      (newContent) => this.referenceFileService.saveReference(newContent)
    );
    createFile(
      '/home/user/notes.txt',
      () => this.notesService.notesContent(),
      (newContent) => this.notesService.saveNotes(newContent)
    );

    // Initial module files (these are currently immutable via shell)
    this.moduleService.getModuleFileNames().forEach(fileName => {
      const moduleContentSignal = this.moduleService.getModuleFileContent(fileName);
      if (moduleContentSignal) {
        createFile(
          `/data/modules/${fileName}`,
          () => moduleContentSignal(),
          (newContent) => this.moduleService.updateModuleFileContent(fileName, newContent) // Allow editing module JSON
        );
      }
    });
  }

  executeCommand(input: string): string {
    if (!input) return '';

    // Handle redirection first
    const parts = input.split('>');
    if (parts.length > 1) {
      const commandPart = parts[0].trim();
      const filePath = parts[1].trim();

      if (!filePath) return 'bash: syntax error: redirect requires a file';

      const [cmd, ...cmdArgs] = commandPart.split(/\s+/);
      if (cmd.toLowerCase() !== 'echo') return 'bash: only "echo" command supports redirection currently.';

      const contentToRedirect = cmdArgs.join(' ').replace(/^"|"$/g, ''); // Remove quotes

      const writeSuccess = this.writeFile(filePath, contentToRedirect);
      return writeSuccess ? '' : `bash: failed to write to '${filePath}'`;
    }

    const [command, ...args] = input.trim().split(/\s+/);

    switch (command.toLowerCase()) {
      case 'help':
        return this.getHelp();
      case 'ls':
        return this.ls(args[0]);
      case 'cat':
        return this.cat(args[0]);
      case 'cd':
        return this.cd(args[0]);
      case 'pwd':
        return this.cwd();
      case 'echo':
        return args.join(' '); // Simple echo without redirection
      case 'clear':
        // Handled in component
        return '';
      case 'reboot':
        this.arduinoService.rebootDevice();
        return 'Rebooting device...';
      case 'leds':
        return this.leds(args);
      case 'uname':
        if (args[0] === '-a') {
          const sysInfo = this.arduinoService.systemInfo();
          return `fireCNC ${sysInfo.firmwareVersion} fireCNC-simulated-kernel GNU/Linux`;
        }
        return `uname: invalid option -- '${args[0]}'\nTry 'uname --help' for more information.`;
      case 'mkdir':
        return this.mkdir(args[0]);
      case 'rm':
        const recursive = args[0] === '-r';
        const targetPath = recursive ? args[1] : args[0];
        return this.rm(targetPath, recursive);
      case 'edit':
      case 'vi': // 'vi' is an alias for 'edit'
        return this.edit(args[0]);
      case 'ping': // NEW: Ping command
        return this.ping(args[0]);
      default:
        return `fireCNC: command not found: ${command}`;
    }
  }

  private resolvePath(path: string): { fullPath: string, node: FsNode | undefined, name: string, parentPath: string, parentNode: FsNode | undefined } {
    let resolvedPath: string;
    if (!path) {
      resolvedPath = this.cwd();
    } else if (path.startsWith('/')) {
      resolvedPath = path;
    } else {
      resolvedPath = `${this.cwd() === '/' ? '' : this.cwd()}/${path}`;
    }

    const parts = resolvedPath.split('/').filter(p => p !== '');
    const finalParts: string[] = [];
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        if (finalParts.length > 0) finalParts.pop();
      } else {
        finalParts.push(part);
      }
    }
    const fullPath = '/' + finalParts.join('/');
    const name = finalParts.length > 0 ? finalParts[finalParts.length - 1] : '';
    const parentPath = '/' + finalParts.slice(0, -1).join('/') || '/';

    return {
      fullPath,
      node: this.fs[fullPath],
      name,
      parentPath,
      parentNode: this.fs[parentPath],
    };
  }

  private ls(pathStr?: string): string {
    const { fullPath, node } = this.resolvePath(pathStr || this.cwd());

    if (!node) return `ls: cannot access '${fullPath}': No such file or directory`;
    if (node.type !== 'dir') return fullPath.split('/').pop() || '';
    if (!node.children || node.children.length === 0) return '';

    return [...node.children] // Create a copy to sort
      .sort((a, b) => {
        const pathA = `${fullPath === '/' ? '' : fullPath}/${a}`;
        const pathB = `${fullPath === '/' ? '' : fullPath}/${b}`;
        const nodeA = this.fs[pathA];
        const nodeB = this.fs[pathB];

        // Directories first
        if (nodeA?.type === 'dir' && nodeB?.type !== 'dir') return -1;
        if (nodeA?.type !== 'dir' && nodeB?.type === 'dir') return 1;
        return a.localeCompare(b);
      })
      .map(childName => {
        const childPath = `${fullPath === '/' ? '' : fullPath}/${childName}`;
        const childNode = this.fs[childPath];
        return childNode?.type === 'dir' ? `${childName}/` : childName;
      })
      .join('\n');
  }

  private cat(pathStr?: string): string {
    if (!pathStr) return 'cat: missing file operand';

    const { fullPath, node } = this.resolvePath(pathStr);

    if (!node) return `cat: ${pathStr}: No such file or directory`;
    if (node.type !== 'file') return `cat: ${pathStr}: Is a directory`;

    if (typeof node.content === 'function') {
      return node.content();
    } else if (typeof node.content === 'string') {
      return node.content;
    }
    return '';
  }

  private cd(pathStr?: string): string {
    if (!pathStr) {
      this.cwd.set('/home/user');
      return '';
    }

    const { fullPath, node } = this.resolvePath(pathStr);

    if (!node) return `cd: ${pathStr}: No such file or directory`;
    if (node.type !== 'dir') return `cd: ${pathStr}: Not a directory`;

    this.cwd.set(fullPath);
    return '';
  }

  private leds(args: string[]): string {
    if (args.length === 0) {
      return this.getLedsHelp();
    }

    const subCommand = args[0];

    switch (subCommand) {
      case 'set': {
        if (args.length < 4) {
          return `Usage: leds set <strip> <color> <brightness>\nStrips: all, onboard`;
        }
        const strip = args[1];
        const color = args[2];
        const brightnessStr = args[3];

        if (!/^#([0-9a-fA-F]{3}){1,2}$/.test(color)) {
          return `Invalid color format. Use hex #RRGGBB or #RGB.`;
        }

        const brightness = parseInt(brightnessStr, 10);
        if (isNaN(brightness) || brightness < 0 || brightness > 255) {
          return `Invalid brightness '${brightnessStr}'. Must be a number between 0 and 255.`;
        }

        if (strip === 'onboard') {
          this.arduinoService.updateOnboardLedState({ color, brightness, flashing: false });
          return `Onboard LED set to ${color} at ${brightness} brightness.`;
        } else if (strip === 'all') {
          this.arduinoService.updateLedsState({ color, brightness, effect: 'Solid', power: true });
          return `All LED strips set to ${color} at ${brightness} brightness.`;
        } else {
          return `Invalid strip '${strip}'. Use 'all' or 'onboard'.`;
        }
      }
      case 'effect': {
        if (args.length < 3) {
          return `Usage: leds effect <strip> <effect>\nStrips: all\nEffects: Solid, Rainbow, Chase, Off`;
        }
        const strip = args[1];
        const effect = args[2];
        const validEffects: LedEffect[] = ['Solid', 'Rainbow', 'Chase', 'Off'];

        const matchedEffect = validEffects.find(e => e.toLowerCase() === effect.toLowerCase());

        if (!matchedEffect) {
          return `Invalid effect '${effect}'.\nAvailable effects: ${validEffects.join(', ')}`;
        }

        if (strip === 'all') {
          const power = matchedEffect !== 'Off';
          this.arduinoService.updateLedsState({ effect: matchedEffect, power });
          return `All LED strips effect set to ${matchedEffect}.`;
        } else if (strip === 'onboard') {
          return `Effects are not supported for the onboard LED.`;
        } else {
          return `Invalid strip '${strip}'. Use 'all'.`;
        }
      }
      case 'flash': {
        if (args.length < 3) {
          return `Usage: leds flash <strip> <on|off>\nStrips: onboard`;
        }
        const strip = args[1];
        const flashState = args[2].toLowerCase();
        if (flashState !== 'on' && flashState !== 'off') {
          return `Invalid state '${flashState}'. Use 'on' or 'off'.`;
        }
        const flashing = flashState === 'on';

        if (strip === 'onboard') {
          this.arduinoService.updateOnboardLedState({ flashing });
          return `Onboard LED flashing set to ${flashState}.`;
        } else {
          return `Flashing is only supported for the onboard LED via CLI.`;
        }
      }
      default:
        return `Unknown leds command '${subCommand}'.\n` + this.getLedsHelp();
    }
  }

  private getLedsHelp(): string {
    return `
Usage: leds <command> [args...]

Commands:
  set <strip> <color> <brightness>
    Sets color and brightness for a strip.
    - strip: 'all' or 'onboard'.
    - color: Hex format (e.g., #FF0000).
    - brightness: 0-255.

  effect <strip> <effect>
    Applies a visual effect to a strip.
    - strip: 'all'.
    - effect: 'Solid', 'Rainbow', 'Chase', 'Off'.

  flash <strip> <on|off>
    Toggles flashing for the onboard LED.
    - strip: 'onboard'.
    `;
  }

  // NEW: mkdir command
  private mkdir(pathStr?: string): string {
    if (!pathStr) return 'mkdir: missing operand';

    const { fullPath, node, parentNode, parentPath, name } = this.resolvePath(pathStr);

    if (node) return `mkdir: cannot create directory '${fullPath}': File exists`;
    if (!parentNode || parentNode.type !== 'dir') return `mkdir: cannot create directory '${fullPath}': No such file or directory`;

    this.fs[fullPath] = { type: 'dir', children: [] };
    parentNode.children!.push(name); // Add to parent's children
    parentNode.children!.sort(); // Keep children sorted
    return '';
  }

  // NEW: rm command
  private rm(pathStr?: string, recursive: boolean = false): string {
    if (!pathStr) return 'rm: missing operand';

    const { fullPath, node, parentNode, name } = this.resolvePath(pathStr);

    // Prevent deleting critical paths
    if (['/', '.', '..', '/home/user'].includes(fullPath) || pathStr === '.' || pathStr === '..') {
      return `rm: cannot remove '${pathStr}': Permission denied`;
    }

    if (!node) return `rm: cannot remove '${fullPath}': No such file or directory`;

    if (node.type === 'dir') {
      if (node.children && node.children.length > 0 && !recursive) {
        return `rm: cannot remove '${fullPath}': Directory not empty (use -r to override)`;
      }
      // Remove directory and its children from fs if recursive
      if (recursive) {
        for (const child of (node.children || [])) {
          this.rm(`${fullPath}/${child}`, true); // Recursively delete children
        }
      }
    }

    delete this.fs[fullPath]; // Remove node from file system
    if (parentNode && parentNode.children) {
      parentNode.children = parentNode.children.filter(child => child !== name);
    }

    return '';
  }

  // NEW: edit command (simplified)
  private edit(filePath: string): string {
    if (!filePath) return 'edit: missing file operand';

    const { fullPath, node } = this.resolvePath(filePath);

    if (!node) {
      // If file doesn't exist, inform how to create it
      return `edit: file '${filePath}' does not exist. Create it using 'echo "content" > ${filePath}'.`;
    }
    if (node.type === 'dir') {
      return `edit: ${filePath}: Is a directory`;
    }

    // If file exists, display content and inform how to modify
    let content = '';
    if (typeof node.content === 'function') {
      content = node.content();
    } else if (typeof node.content === 'string') {
      content = node.content;
    }

    return `Current content of '${filePath}':\n${content}\n\nTo modify this file, use redirection (e.g., 'echo "new content" > ${filePath}').`;
  }

  // NEW: ping command (simulated)
  private ping(ipAddress: string): string {
    if (!ipAddress) {
      return 'ping: missing host operand\nUsage: ping <IP_ADDRESS>';
    }

    // Basic regex for IPv4 validation (not exhaustive, but good enough for simulation)
    const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    if (!ipv4Regex.test(ipAddress)) {
      return `ping: ${ipAddress}: Name or service not known`;
    }

    let output = `Pinging ${ipAddress} with 32 bytes of data:\n`;
    for (let i = 0; i < 4; i++) {
      const time = Math.floor(Math.random() * 10) + 1; // 1-10ms
      output += `Reply from ${ipAddress}: bytes=32 time=${time}ms TTL=64\n`;
    }
    output += `\nPing statistics for ${ipAddress}:\n`;
    output += `    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),\n`;
    output += `Approximate round trip times in milli-seconds:\n`;
    output += `    Minimum = 1ms, Maximum = 10ms, Average = 5ms`;
    
    return output;
  }

  // Helper for `echo > file` redirection
  private writeFile(pathStr: string, content: string): boolean {
    const { fullPath, node, parentNode, name } = this.resolvePath(pathStr);

    if (parentNode && parentNode.type === 'file') {
      return false; // Cannot write to a file whose parent is a file.
    }
    if (!parentNode) {
      return false; // Parent directory does not exist
    }

    if (node && node.type === 'dir') {
      return false; // Cannot write to a directory
    }

    if (node && node.type === 'file') {
      if (node.contentSetter) {
        return node.contentSetter(content); // Use specific setter if available
      } else if (typeof node.content === 'string') {
        node.content = content; // Update mutable string content directly
        return true;
      }
      return false; // Existing file is read-only via function or has no setter
    } else {
      // File does not exist, create it as a simple mutable file
      this.fs[fullPath] = { type: 'file', content: content };
      parentNode!.children!.push(name);
      parentNode!.children!.sort();
      return true;
    }
  }


  private getHelp(): string {
    return `
fireCNC Shell, version 1.0.0
These shell commands are defined internally. Type 'help' to see this list.

  help              Show this message
  ls [PATH]         List directory contents
  cat <FILE>        Display file contents
  cd <DIR>          Change the current directory
  pwd               Print the current working directory
  echo [ARGS]       Display a line of text (supports redirection: echo "text" > file)
  clear             Clear the terminal screen (in UI)
  reboot            Reboot the fireCNC device
  uname -a          Print system information
  leds              Control LEDs. Type 'leds' for subcommand help.
  mkdir <DIR>       Create a new directory
  edit <FILE>       Display file content and hint at editing via redirection
  vi <FILE>         Alias for 'edit'
  rm [-r] <PATH>    Remove files or directories (-r for recursive deletion)
  ping <IP_ADDRESS> Send ICMP echo requests to network hosts
    `;
  }
}