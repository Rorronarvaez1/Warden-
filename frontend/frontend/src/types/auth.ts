export interface LoginCredentials {
    email:string;
    password:string;
}

export interface User {
    id:string;
    email:string;
    name:string;
}

export interface AuthResponse {
    user: User;
    token: string;
}

export interface LoginError {
    field?: 'email' | 'password' | 'general';
    message: string;
}