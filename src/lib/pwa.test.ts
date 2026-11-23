import { describe, expect, it } from 'vitest';
import { installMode } from './pwa';

describe('installation de l’appli', () => {
  it('ne propose rien si l’appli est déjà installée', () => {
    expect(installMode({ standalone: true, hasPrompt: true, ios: true })).toBe('installed');
  });
  it('propose le bouton natif quand le navigateur le permet', () => {
    expect(installMode({ standalone: false, hasPrompt: true, ios: false })).toBe('prompt');
  });
  it('explique la marche à suivre sur iPhone et iPad', () => {
    expect(installMode({ standalone: false, hasPrompt: false, ios: true })).toBe('ios');
  });
  it('reste discret ailleurs', () => {
    expect(installMode({ standalone: false, hasPrompt: false, ios: false })).toBe('none');
  });
});
