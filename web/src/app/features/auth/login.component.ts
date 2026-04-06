import { Component, signal } from '@angular/core';
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
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .login-shell {
      width: min(100%, 1120px);
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(20rem, 0.88fr);
      gap: 1rem;
      padding: 1rem;
    }
    .login-showcase {
      padding: 1.2rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .login-showcase h1 {
      font-size: clamp(2.4rem, 5vw, 4rem);
      margin: 0.9rem 0 0.8rem;
    }
    .tagline { color: var(--muted); max-width: 38rem; font-size: 1rem; }
    .showcase-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.85rem;
      margin-top: 1.4rem;
    }
    .showcase-card {
      min-height: 100%;
      background: rgba(255, 255, 255, 0.62);
    }
    .showcase-card strong { display: block; margin-bottom: 0.35rem; font-size: 1rem; }
    .showcase-card p { color: var(--muted); font-size: 0.88rem; }
    .login-card {
      width: 100%;
      max-width: 100%;
      padding: 1.4rem;
      background: rgba(255, 253, 249, 0.9);
    }
    .logo-row {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      margin-bottom: 1.1rem;
    }
    .logo {
      width: 3rem;
      height: 3rem;
      border-radius: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, var(--accent) 0%, #14532d 100%);
      color: #fff;
      font-weight: 800;
      flex-shrink: 0;
    }
    .form-kicker { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); font-weight: 800; }
    h2 { font-family: 'Fraunces', Georgia, serif; font-size: 1.7rem; margin-top: 0.2rem; }
    .form { text-align: left; }
    .field { margin-bottom: 14px; }
    label { display: block; font-size: 0.84rem; font-weight: 800; color: var(--ink); margin-bottom: 6px; }
    .btn-primary { margin-top: 8px; }
    .google-mark { font-weight: 800; font-size: 1rem; }
    .switch-link { margin-top: 16px; font-size: 0.86rem; color: var(--muted); }
    .link-btn {
      background: none; border: none; color: var(--accent-strong); cursor: pointer;
      font-size: 0.85rem; font-weight: 800; padding: 0;
      &:hover { text-decoration: underline; }
    }

    @media (max-width: 920px) {
      .login-shell,
      .showcase-grid {
        grid-template-columns: 1fr;
      }
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
