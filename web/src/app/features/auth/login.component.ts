import { Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <section class="login-shell section-card">
        <div class="login-showcase">
          <span class="eyebrow">Grammar, Vocabulary, Reading, Recall</span>
          <h1>ReadWell turns each chapter into a guided English lesson.</h1>
          <p class="tagline">Learners read authentic-feeling stories, notice grammar in context, tap vocabulary inside paragraphs, and finish with interactive quiz feedback.</p>

          <div class="showcase-grid">
            <div class="showcase-card card">
              <strong>Read with purpose</strong>
              <p>Story-first lessons with a clear grammar target and useful vocabulary.</p>
            </div>
            <div class="showcase-card card">
              <strong>Notice the form</strong>
              <p>Highlight grammar patterns directly in examples and paragraphs.</p>
            </div>
            <div class="showcase-card card">
              <strong>Retrieve and reflect</strong>
              <p>Immediate quiz feedback reinforces comprehension and accuracy.</p>
            </div>
          </div>
        </div>

        <div class="login-card card">
          <div class="logo-row">
            <div class="logo">RW</div>
            <div>
              <span class="form-kicker">Welcome back</span>
              <h2>{{ showSignUp() ? 'Create your study account' : 'Sign in to continue learning' }}</h2>
            </div>
          </div>

          @if (!showSignUp()) {
            <form (ngSubmit)="signIn()" class="form">
              <div class="field">
                <label>Email</label>
                <input class="input" type="email" [(ngModel)]="email" name="email" required placeholder="you@example.com" />
              </div>
              <div class="field">
                <label>Password</label>
                <input class="input" type="password" [(ngModel)]="password" name="password" required placeholder="••••••••" />
              </div>
              @if (error()) {
                <p class="error-msg">{{ error() }}</p>
              }
              <button class="btn btn-primary btn-full" type="submit" [disabled]="loading()">
                {{ loading() ? 'Signing in...' : 'Sign In' }}
              </button>
            </form>
            <div class="divider">or</div>
            <button class="btn btn-google btn-full" (click)="signInGoogle()" [disabled]="loading()">
              <span class="google-mark">G</span> Continue with Google
            </button>
            <button class="link-btn" type="button" (click)="signInGoogleInThisTab()" [disabled]="loading()">
              Continue with Google in this tab
            </button>
            <p class="switch-link">
              Don't have an account?
              <button class="link-btn" (click)="showSignUp.set(true)">Create one</button>
            </p>
          } @else {
            <form (ngSubmit)="signUp()" class="form">
              <div class="field">
                <label>Email</label>
                <input class="input" type="email" [(ngModel)]="email" name="email" required placeholder="you@example.com" />
              </div>
              <div class="field">
                <label>Password</label>
                <input class="input" type="password" [(ngModel)]="password" name="password" required placeholder="Min 6 characters" />
              </div>
              @if (error()) {
                <p class="error-msg">{{ error() }}</p>
              }
              <button class="btn btn-primary btn-full" type="submit" [disabled]="loading()">
                {{ loading() ? 'Creating account...' : 'Create Account' }}
              </button>
            </form>
            <p class="switch-link">
              Already have an account?
              <button class="link-btn" (click)="showSignUp.set(false)">Sign in</button>
            </p>
          }
        </div>
      </section>
    </div>
  `,
  styles: [],
})
export class LoginComponent {
  email = '';
  password = '';
  error = signal('');
  loading = signal(false);
  showSignUp = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {
    effect(() => {
      if (this.auth.initialized() && this.auth.isLoggedIn()) {
        this.router.navigate(['/browse']);
      }
    });
  }

  async signIn() {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.signIn(this.email, this.password);
      this.router.navigate(['/browse']);
    } catch (e: any) {
      this.error.set(this.friendlyError(e.code));
    } finally {
      this.loading.set(false);
    }
  }

  async signUp() {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.signUp(this.email, this.password);
      this.router.navigate(['/browse']);
    } catch (e: any) {
      this.error.set(this.friendlyError(e.code));
    } finally {
      this.loading.set(false);
    }
  }

  async signInGoogle() {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.signInWithGoogle();
      this.router.navigate(['/browse']);
    } catch (e: any) {
      if (this.shouldUseGoogleRedirect(e?.code)) {
        await this.auth.signInWithGoogleRedirect();
        return;
      }
      this.error.set(this.friendlyError(e.code));
    } finally {
      this.loading.set(false);
    }
  }

  async signInGoogleInThisTab() {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.signInWithGoogleRedirect();
    } catch (e: any) {
      this.error.set(this.friendlyError(e.code));
      this.loading.set(false);
    }
  }

  private shouldUseGoogleRedirect(code?: string): boolean {
    return code === 'auth/popup-blocked' || code === 'auth/web-storage-unsupported';
  }

  private friendlyError(code: string): string {
    switch (code) {
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'Email already in use. Try signing in.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/popup-blocked':
        return 'The Google sign-in popup was blocked. Try continuing with Google in this tab.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}
