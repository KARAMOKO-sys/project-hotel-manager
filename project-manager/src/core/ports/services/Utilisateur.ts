// 1. Tables Principales
export class User {
    _id: string | undefined;
    email: string;
    password_hash: string | undefined;
    role: 'admin' | 'manager' | 'staff' | 'client';
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
    created_at: Date;
    updated_at: Date;
  }
  
  export class UserRole {
    _id: string;
    name: string;
    permissions: string[];
  }