import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'browse', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'browse',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/browse/browse.component').then((m) => m.BrowseComponent),
  },
  {
    path: 'placement',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/placement/placement.component').then((m) => m.PlacementComponent),
  },
  {
    path: 'stories/:storyId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/browse/story-detail.component').then((m) => m.StoryDetailComponent),
  },
  {
    path: 'chapters/:chapterId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reader/reader.component').then((m) => m.ReaderComponent),
  },
  {
    path: 'progress',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/progress/progress.component').then((m) => m.ProgressComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  { path: '**', redirectTo: 'browse' },
];
