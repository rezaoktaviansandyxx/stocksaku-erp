export interface CustomerResponse {
  id: number;
  organization_id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  created_at: string;
}

export interface CustomerCreate {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface CustomerUpdate {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}
