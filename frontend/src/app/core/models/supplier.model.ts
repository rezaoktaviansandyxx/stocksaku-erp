export interface SupplierResponse {
  id: number;
  organization_id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  created_at: string;
}

export interface SupplierCreate {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface SupplierUpdate {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
}
