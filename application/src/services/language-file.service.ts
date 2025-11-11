/**
 * @file src/services/language-file.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Manages the storage and retrieval of language JSON files.
 */
import { Injectable, signal, WritableSignal, inject } from '@angular/core';
import { PersistenceService } from './persistence.service';

const defaultEnTranslations = {
    "nav.dashboard": "Dashboard",
    "nav.status": "Status",
    "nav.visuals": "Visuals",
    "nav.pendant": "Pendant",
    "nav.alexa": "Alexa",
    "nav.settings": "Settings",
    "nav.system": "System",
    "nav.information": "Information",
    "nav.activity": "Activity",
    "subnav.settings.general": "General",
    "subnav.settings.network": "Network",
    "subnav.settings.dashboard": "Dashboard",
    "subnav.settings.onboardIo": "Onboard I/O",
    "subnav.settings.expansion": "Expansion",
    "subnav.settings.backup": "Backup",
    "subnav.settings.advanced": "Advanced",
    "subnav.system.shell": "Shell",
    "subnav.system.modules": "Modules",
    "subnav.system.reboot": "Reboot",
    "subnav.info.about": "About",
    "subnav.info.hardware": "Hardware",
    "subnav.info.software": "Software",
    "subnav.info.logic": "Logic",
    "subnav.info.routes": "Routes & Endpoints",
    "subnav.info.changelog": "Change Log",
    "subnav.info.help": "Help",
    "subnav.activity.console": "Console Output",
    "subnav.activity.systemLog": "System Log",
    "subnav.activity.snmpLog": "SNMP Log",
    "header.ethernetActivity": "Ethernet Activity",
    "header.wifiApActive": "Wireless Status: Access Point Active",
    "header.wifiStationStatus": "Wireless Status: {{status}} ({{signalStrength}}%)",
    "header.onboardLedTitle": "Onboard LED (GPIO38)",
    "banner.firmwareUpdate": "Firmware update available:",
    "banner.releasedOn": "Released on {{releaseDate}}",
    "banner.viewOnGithub": "View on GitHub",
    "notification.error.title": "Validation Error!",
    "notification.success.title": "Success!",
    "notification.alexa.title": "Alexa Announcement",
    "mobileNav.status": "Status",
    "mobileNav.settings": "Settings",
    "mobileNav.info": "Info",
    "mobileNav.activity": "Activity",
    "mobileNav.visuals": "Visuals",
    "mobileNav.pendant": "Pendant",
    "mobileNav.alexa": "Alexa",
    "modal.reboot.title": "Confirm Reboot",
    "modal.reboot.message": "Are you sure you want to reboot the fireCNC device? This action is irreversible.",
    "modal.reboot.confirm": "Reboot",
    "modal.general.cancel": "Cancel",
    "footer.adminModeEnabled.title": "Admin Mode Enabled",
    "footer.adminModeEnabled.text": "Admin Mode Enabled",
    "footer.logout.title": "Logout",
    "footer.login.title": "Login",
    "footer.appVersion": "fireCNC App v{{appVersion}}",
    "footer.released": "(Released: {{appReleaseDate}})",
    "footer.latestGithub": "(Latest GitHub: v{{version}})",
    "footer.config": "Config",
    "footer.internet": "Internet",
    "footer.esp32": "ESP32",
    "footer.linuxcnc": "LinuxCNC",
    "footer.settingsLink.title": "View Language & General Settings",
    "rebootOverlay.rebooting": "Rebooting fireCNC...",
    "rebootOverlay.pleaseWait": "Please wait, this may take a few moments.",
    "settings.language.title": "Language",
    "settings.language.label": "Application Language"
};

@Injectable({
  providedIn: 'root',
})
export class LanguageFileService {
  private persistenceService = inject(PersistenceService);
  private readonly LANG_FILE_PREFIX = 'fireCNC_lang_';

  availableLangs: WritableSignal<string[]> = signal([]);
  lastSaveError: WritableSignal<string | null> = signal(null);

  constructor() {
    this.initializeLanguages();
  }

  private initializeLanguages(): void {
    const langKeys = this.persistenceService.getKeys(this.LANG_FILE_PREFIX);
    if (langKeys.length === 0) {
      // First time run, create default english file
      this.createLanguageFile('en', JSON.stringify(defaultEnTranslations, null, 2));
    } else {
      this.availableLangs.set(langKeys.map(k => k.replace(this.LANG_FILE_PREFIX, '')));
    }
  }

  getAvailableLanguages(): string[] {
    return this.availableLangs();
  }

  getLanguageFileContent(lang: string): string {
    return this.persistenceService.getItem<string>(`${this.LANG_FILE_PREFIX}${lang}`) || '{}';
  }

  updateLanguageFileContent(lang: string, content: string): boolean {
    this.lastSaveError.set(null);
    try {
      JSON.parse(content); // Validate JSON before saving
      this.persistenceService.setItem(`${this.LANG_FILE_PREFIX}${lang}`, content);
      return true;
    } catch (e: any) {
      this.lastSaveError.set(e.message);
      return false;
    }
  }

  createLanguageFile(lang: string, initialContent?: string): void {
    if (this.availableLangs().includes(lang)) {
      alert(`Language '${lang}' already exists.`);
      return;
    }
    const content = initialContent || this.getLanguageFileContent('en');
    this.persistenceService.setItem(`${this.LANG_FILE_PREFIX}${lang}`, content);
    this.availableLangs.update(langs => [...langs, lang].sort());
  }
}