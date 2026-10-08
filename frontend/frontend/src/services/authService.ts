import type { LoginCredentials, AuthResponse } from "../types/auth";

export const authService = {
    async login(credentials: LoginCredentials): Promise<AuthResponse> {
        // Simulacion de llamada a API
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (
                    credentials.email === 'admin@test.com' &&
                    credentials.password === '123456'
                ) {
                    resolve({
                        user: {
                            id: '1',
                            email: credentials.email,
                            name: 'Admin User',
                        },
                        token: 'fake-jwt-token-xyz',
                    });
                } else {
                    reject(new Error('Credenciales Incorrectas'));
                }
            }, 1000);
        });
    },
};