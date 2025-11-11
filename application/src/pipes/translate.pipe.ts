/**
 * @file src/pipes/translate.pipe.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A pipe that transforms a translation key into its corresponding string value
 * in the currently selected language.
 */
import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

@Pipe({
  name: 'translate',
  pure: false // Must be false to update when the language signal changes
})
export class TranslatePipe implements PipeTransform {
  private languageService = inject(LanguageService);

  transform(key: string, params?: Record<string, any>): string {
    return this.languageService.translate(key, params);
  }
}
