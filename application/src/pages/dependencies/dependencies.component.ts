/**
 * @file src/pages/dependencies/dependencies.component.ts
 * @project fireCNC
 * @author Mark Dyer
 * @location Blenheim, New Zealand
 * @contact intelliservenz@gmail.com
 *
 * @description
 * Component for the Dependencies page, which inventories all the front-end
 * frameworks and libraries used in the fireCNC application.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Dependency {
  name: string;
  version: string;
  description: string;
  url: string;
}

interface DependencyCategory {
  name: string;
  icon: string;
  dependencies: Dependency[];
}

@Component({
  selector: 'app-dependencies',
  imports: [CommonModule],
  templateUrl: './dependencies.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DependenciesComponent {
  dependencyCategories: DependencyCategory[] = [
    {
      name: 'Core Framework',
      icon: 'fa-solid fa-cubes',
      dependencies: [
        { name: '@angular/core', version: '^20.3.9', description: 'The core Angular framework for building components.', url: 'https://angular.dev/' },
        { name: '@angular/common', version: '^20.3.9', description: 'Commonly needed services, pipes, and directives.', url: 'https://angular.dev/api/common' },
        { name: '@angular/router', version: '^20.3.9', description: 'Provides routing and navigation capabilities.', url: 'https://angular.dev/guide/routing' },
        { name: '@angular/forms', version: '^20.3.9', description: 'Support for building and validating forms.', url: 'https://angular.dev/guide/forms' },
        { name: '@angular/platform-browser', version: '^20.3.9', description: 'Handles DOM rendering and manipulation.', url: 'https://angular.dev/api/platform-browser' },
        { name: '@angular/compiler', version: '^20.3.9', description: 'The Angular template compiler.', url: 'https://angular.dev/api/compiler' }
      ]
    },
    {
      name: 'Reactivity',
      icon: 'fa-solid fa-atom',
      dependencies: [
        { name: 'RxJS', version: '^7.8.3', description: 'A library for reactive programming using Observables.', url: 'https://rxjs.dev/' }
      ]
    },
    {
      name: 'UI & Styling',
      icon: 'fa-solid fa-palette',
      dependencies: [
        { name: 'Tailwind CSS', version: 'Latest via CDN', description: 'A utility-first CSS framework for rapid UI development.', url: 'https://tailwindcss.com/' },
        { name: 'Font Awesome', version: '6.5.3', description: 'The web\'s most popular icon set and toolkit.', url: 'https://fontawesome.com/' }
      ]
    },
    {
      name: 'Utilities',
      icon: 'fa-solid fa-wrench',
      dependencies: [
        { name: 'date-fns', version: '^3.6.0', description: 'Modern JavaScript date utility library.', url: 'https://date-fns.org/' },
        { name: 'marked', version: 'N/A', description: 'Markdown parsing is now handled by a lightweight, internal function.', url: 'https://marked.js.org/' }
      ]
    }
  ];
}