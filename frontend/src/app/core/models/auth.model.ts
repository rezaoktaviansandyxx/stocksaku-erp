export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
}

export interface UserResponse {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface OrganizationResponse {
  id: number;
  name: string;
  slug: string;
  status: string;
  created_at: string;
}

export interface OrganizationCreate {
  name: string;
  slug: string;
}
