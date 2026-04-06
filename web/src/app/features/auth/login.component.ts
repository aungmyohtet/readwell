import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card card">
        <div class="logo">📖</div>
        <h1>ReadWell</h1>
        <p class="tagline">Learn English through stories</p>

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
            <span>G</span> Continue with Google
          </button>
          <p class="switch-link">
            Don't have an account?
            <button class="link-btn" (click)="showSignUp.set(true)">Sign up</button>
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
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e3f0ff 0%, #f3e5f5 100%);
      padding: 16px;
    }
    .login-card {
      width: 100%;
      max-width: 380px;
      text-align: center;
    }
    .logo { font-size: 2.5rem; margin-bottom: 8px; }
    h1 { font-size: 1.6rem; font-weight: 700; color: #2d6cdf; }
    .tagline { color: #888; font-size: 0.9rem; margin: 4px 0 24px; }
    .form { text-align: left; }
    .field { margin-bottom: 14px; }
    label { display: block; font-size: 0.85rem; font-weight: 600; color: #555; margin-bottom: 6px; }
    .btn-primary { margin-top: 8px; }
    .btn-google span { font-weight: 700; font-size: 1rem; }
    .switch-link { margin-top: 16px; font-size: 0.85rem; color: #666; }
    .link-btn {
      background: none; border: none; color: #2d6cdf; cursor: pointer;
      font-size: 0.85rem; font-weight: 600; padding: 0;
      &:hover { text-decoration: underline; }
    }
  `],
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
  ) {}

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
      this.error.set(this.friendlyError(e.code));
    } finally {
      this.loading.set(false);
    }
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
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}
