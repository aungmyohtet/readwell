import { Component, computed, signal, HostListener, ElementRef } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    @if (isLoggedIn()) {
      <header class="shell-header">
        <nav class="navbar">
          <a class="brand" routerLink="/browse">
            <span class="brand-mark">RW</span>
            <span class="brand-copy">
              <strong>ReadWell</strong>
              <small>Read deeply. Notice grammar. Remember vocabulary.</small>
            </span>
          </a>

          <div class="nav-links">
            <a routerLink="/browse" class="nav-link">Library</a>
            <a routerLink="/progress" class="nav-link">Progress</a>
            <a routerLink="/profile" class="nav-pill">Study Profile</a>

            <div class="profile-menu">
              <button class="avatar-btn" (click)="toggleMenu()" [attr.aria-expanded]="menuOpen()">
                <span class="avatar">{{ userInitial() }}</span>
              </button>

              @if (menuOpen()) {
                <div class="dropdown">
                  <div class="dropdown-header">
                    <div class="dropdown-avatar">{{ userInitial() }}</div>
                    <div class="dropdown-user-info">
                      <span class="dropdown-name">{{ displayName() }}</span>
                      <span class="dropdown-email">{{ userEmail() }}</span>
                    </div>
                  </div>

                  <div class="dropdown-divider"></div>

                  <a class="dropdown-item" routerLink="/browse" (click)="closeMenu()">
                    <span class="item-icon">📚</span> Story Library
                  </a>
                  <a class="dropdown-item" routerLink="/progress" (click)="closeMenu()">
                    <span class="item-icon">📊</span> Learning Progress
                  </a>
                  <a class="dropdown-item" routerLink="/profile" (click)="closeMenu()">
                    <span class="item-icon">🧭</span> Study Profile
                  </a>

                  <div class="dropdown-divider"></div>

                  <button class="dropdown-item sign-out" (click)="signOut()">
                    <span class="item-icon">🚪</span> Sign Out
                  </button>
                </div>
              }
            </div>
          </div>
        </nav>
      </header>
    }
    <main class="app-main" [class.with-nav]="isLoggedIn()">
      <router-outlet />
    </main>
  `,
  styleUrl: './app.component.scss',
})
export class AppComponent {
  isLoggedIn = computed(() => this.auth.user() !== null);
  menuOpen = signal(false);

  userInitial = computed(() => {
    const user = this.auth.user();
    if (!user) return '?';
    const name = user.displayName || user.email || '';
    return name.charAt(0).toUpperCase();
  });

  displayName = computed(() => {
    const user = this.auth.user();
    return user?.displayName || 'User';
  });

  userEmail = computed(() => {
    return this.auth.user()?.email || '';
  });

  constructor(
    private auth: AuthService,
    private router: Router,
    private elRef: ElementRef,
  ) {}

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  signOut() {
    this.closeMenu();
    this.auth.signOut();
  }

  // Close the dropdown when clicking anywhere outside it
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.closeMenu();
    }
  }
}
