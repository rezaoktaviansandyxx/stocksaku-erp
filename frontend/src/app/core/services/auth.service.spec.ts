import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';

describe('AuthService', () => {
  let service: AuthService;
  let api: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    api = TestBed.inject(ApiService);
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return null token when not logged in', () => {
    expect(service.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should store and retrieve token', () => {
    localStorage.setItem('auth_token', 'fake-token');
    expect(service.getToken()).toBe('fake-token');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('should return null org when none set', () => {
    expect(service.getActiveOrg()).toBeNull();
    expect(service.isOrgSelected()).toBe(false);
  });

  it('should set and retrieve active org', () => {
    service.setActiveOrg('demo-org');
    expect(service.getActiveOrg()).toBe('demo-org');
    expect(service.isOrgSelected()).toBe(true);
  });

  it('should build headers with token and org', () => {
    localStorage.setItem('auth_token', 'fake-token');
    service.setActiveOrg('demo-org');
    const headers = service.buildHeaders();
    expect(headers['Authorization']).toBe('Bearer fake-token');
    expect(headers['X-Organization-Slug']).toBe('demo-org');
  });

  it('should clear token and org on logout', () => {
    localStorage.setItem('auth_token', 'fake-token');
    service.setActiveOrg('demo-org');
    service.logout();
    expect(service.getToken()).toBeNull();
    expect(service.getActiveOrg()).toBeNull();
  });
});
