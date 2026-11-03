import { Injectable, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  isDarkMode = signal<boolean>(true);

  constructor() {
    this.initTheme();
  }

  async initTheme() {
    try {
      const { value } = await Preferences.get({ key: 'app_theme' });
      if (value !== null) {
        this.setTheme(value === 'dark');
      } else {
        // Default to dark
        this.setTheme(true);
      }
    } catch {
      this.setTheme(true);
    }
  }

  async toggleTheme() {
    this.setTheme(!this.isDarkMode());
  }

  async setTheme(dark: boolean) {
    this.isDarkMode.set(dark);
    if (dark) {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      await Preferences.set({ key: 'app_theme', value: 'dark' });
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      await Preferences.set({ key: 'app_theme', value: 'light' });
    }
  }
}

