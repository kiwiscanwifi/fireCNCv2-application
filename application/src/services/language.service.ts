/**
 * @file src/services/language.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Manages the application's current language and provides translation services.
 */
import { Injectable, signal, WritableSignal, inject, computed } from '@angular/core';
import { PersistenceService } from './persistence.service';
import { LanguageFileService } from './language-file.service';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private persistenceService = inject(PersistenceService);
  private languageFileService = inject(LanguageFileService);
  private readonly CURRENT_LANG_KEY = 'fireCNC_currentLanguage';

  currentLang: WritableSignal<string>;
  availableLangs = this.languageFileService.availableLangs;
  
  private translations: WritableSignal<Record<string, string>> = signal({});

  constructor() {
    const storedLang = this.persistenceService.getItem<string>(this.CURRENT_LANG_KEY);
    const defaultLang = 'en';
    this.currentLang = signal(storedLang || defaultLang);
    this.loadLanguage(this.currentLang());
  }

  setLanguage(lang: string): void {
    this.currentLang.set(lang);
    this.persistenceService.setItem(this.CURRENT_LANG_KEY, lang);
    this.loadLanguage(lang);
  }

  loadLanguage(lang: string): void {
    try {
      const content = this.languageFileService.getLanguageFileContent(lang);
      const parsed = JSON.parse(content);
      this.translations.set(parsed);
    } catch (e) {
      console.error(`Failed to load or parse language file for '${lang}':`, e);
      this.translations.set({});
    }
  }

  translate(key: string, params?: Record<string, any>): string {
    const dictionary = this.translations();
    let translation = dictionary[key] || key;

    if (params) {
      Object.keys(params).forEach(paramKey => {
        const regex = new RegExp(`{{${paramKey}}}`, 'g');
        translation = translation.replace(regex, params[paramKey]);
      });
    }
    
    return translation;
  }
}
