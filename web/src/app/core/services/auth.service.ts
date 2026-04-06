import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onIdTokenChanged,
  User,
} from 'firebase/auth';
import { environment } from '../../../environments/environment';

const app = initializeApp(environment.firebase);
const firebaseAuth = getAuth(app);

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(null);

  /**
   * Becomes true once Firebase has resolved the initial auth state from
   * local storage. Guards must wait for this before making routing decisions.
   */
  private _initialized = signal(false);

  readonly user = this._user.asReadonly();
  readonly initialized = this._initialized.asReadonly();

  constructor(private router: Router) {
    // onIdTokenChanged fires on sign-in, sign-out, AND token refresh —
    // more complete than onAuthStateChanged which misses token refreshes.
    onIdTokenChanged(firebaseAuth, (u) => {
      this._user.set(u);
      this._initialized.set(true);
    });
  }

  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  }

  async signUp(email: string, password: string): Promise<void> {
    await createUserWithEmailAndPassword(firebaseAuth, email, password);
  }

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(firebaseAuth, provider);
  }

  async signOut(): Promise<void> {
    await signOut(firebaseAuth);
    this.router.navigate(['/login']);
  }

  /**
   * Returns a valid (non-expired) ID token. Firebase refreshes it
   * automatically when close to expiry. Pass forceRefresh=true to
   * force a network call — used after a 401 response.
   */
  async getIdToken(forceRefresh = false): Promise<string | null> {
    const user = this._user();
    return user ? user.getIdToken(forceRefresh) : null;
  }

  isLoggedIn(): boolean {
    return this._user() !== null;
  }
}
