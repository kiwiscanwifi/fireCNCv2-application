/**
 * @file src/services/markdown.service.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * A service to handle simple markdown-to-HTML conversion.
 */
import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class MarkdownService {
  // FIX: Explicitly type `sanitizer` as `DomSanitizer` to resolve 'Property does not exist on type unknown' errors.
  private sanitizer: DomSanitizer;

  constructor() {
    this.sanitizer = inject(DomSanitizer);
  }

  private inlineParse(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
  }

  parse(content: string): SafeHtml {
    if (!content) return this.sanitizer.bypassSecurityTrustHtml('');

    const iconMap: Record<string, string> = {
      'Initialization & Network Logic': 'fa-solid fa-power-off',
      'System Stability & Watchdogs': 'fa-solid fa-dog',
      'Visuals & Motion Control': 'fa-solid fa-robot',
      'Monitoring & SNMP Integration': 'fa-solid fa-broadcast-tower',
      'Power Management & Safety': 'fa-solid fa-shield-alt',
      'Security & Admin Access': 'fa-solid fa-user-shield',
    };

    const lines = content.split('\n');
    let html = '';
    let inUl = false;
    let inOl = false;
    let paragraphBuffer: string[] = [];

    const flushParagraph = () => {
        if (paragraphBuffer.length > 0) {
            html += `<p>${paragraphBuffer.join('<br>')}</p>`;
            paragraphBuffer = [];
        }
    };
    
    const closeLists = () => {
        if (inUl) html += '</ul>';
        if (inOl) html += '</ol>';
        inUl = false;
        inOl = false;
    };

    for (const line of lines) {
        // Headers
        if (line.startsWith('### ')) {
            flushParagraph();
            closeLists();
            const title = line.substring(4).trim();
            const iconClass = iconMap[title];
            const iconHtml = iconClass ? `<i class="${iconClass} mr-3 text-orange-400"></i>` : '';
            html += `<h3 class="flex items-center text-xl font-bold text-gray-200 mt-6 mb-2">${iconHtml}<span>${this.inlineParse(title)}</span></h3>`;
            continue;
        }

        // Unordered List
        if (line.startsWith('* ') || line.startsWith('- ')) {
            flushParagraph();
            if (inOl) { html += '</ol>'; inOl = false; }
            if (!inUl) {
                html += '<ul>';
                inUl = true;
            }
            html += `<li>${this.inlineParse(line.substring(2))}</li>`;
            continue;
        }
        
        // Ordered List
        const olMatch = line.match(/^(\d+)\. (.*)/);
        if (olMatch) {
            flushParagraph();
            if (inUl) { html += '</ul>'; inUl = false; }
            if (!inOl) {
                html += '<ol>';
                inOl = true;
            }
            html += `<li>${this.inlineParse(olMatch[2])}</li>`;
            continue;
        }
        
        closeLists();

        // Buffer paragraph lines
        if (line.trim() !== '') {
            paragraphBuffer.push(this.inlineParse(line));
        } else {
            flushParagraph();
        }
    }
    
    flushParagraph();
    closeLists();

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
