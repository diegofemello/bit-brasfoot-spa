import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GameStateService {
  private readonly selectedSaveGameStorageKey = 'bitfoot.selectedSaveGameId';
  private readonly selectedClubStorageKey = 'bitfoot.selectedClubId';

  private readonly selectedUserIdSignal = signal<string | null>(null);
  private readonly selectedSaveGameIdSignal = signal<string | null>(
    this.readStorage(this.selectedSaveGameStorageKey),
  );
  private readonly selectedClubIdSignal = signal<string | null>(
    this.readStorage(this.selectedClubStorageKey),
  );
  private readonly pendingSaveNameSignal = signal<string | null>(null);

  readonly selectedUserId = this.selectedUserIdSignal.asReadonly();
  readonly selectedSaveGameId = this.selectedSaveGameIdSignal.asReadonly();
  readonly selectedClubId = this.selectedClubIdSignal.asReadonly();
  readonly pendingSaveName = this.pendingSaveNameSignal.asReadonly();
  readonly hasActiveSave = computed(() => this.selectedSaveGameIdSignal() !== null);

  selectUser(userId: string) {
    this.selectedUserIdSignal.set(userId);
  }

  selectSaveGame(saveGameId: string) {
    this.selectedSaveGameIdSignal.set(saveGameId);
    this.writeStorage(this.selectedSaveGameStorageKey, saveGameId);
  }

  selectClub(clubId: string) {
    this.selectedClubIdSignal.set(clubId);
    this.writeStorage(this.selectedClubStorageKey, clubId);
  }

  setPendingSaveName(name: string) {
    this.pendingSaveNameSignal.set(name);
  }

  clearPendingSaveName() {
    this.pendingSaveNameSignal.set(null);
  }

  clearActiveSaveContext() {
    this.selectedSaveGameIdSignal.set(null);
    this.selectedClubIdSignal.set(null);
    this.removeStorage(this.selectedSaveGameStorageKey);
    this.removeStorage(this.selectedClubStorageKey);
  }

  reset() {
    this.selectedUserIdSignal.set(null);
    this.selectedSaveGameIdSignal.set(null);
    this.selectedClubIdSignal.set(null);
    this.pendingSaveNameSignal.set(null);
    this.removeStorage(this.selectedSaveGameStorageKey);
    this.removeStorage(this.selectedClubStorageKey);
  }

  private readStorage(key: string): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(key);
  }

  private writeStorage(key: string, value: string) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(key, value);
  }

  private removeStorage(key: string) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(key);
  }
}
