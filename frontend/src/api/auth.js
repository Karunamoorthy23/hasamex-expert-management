import { http } from './http';

export async function login({ email, password }) {
    return http('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
}

export async function forgotPassword({ email }) {
    return http('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

export async function resetPassword({ token, newPassword, confirmPassword }) {
    return http('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
            token,
            new_password: newPassword,
            confirm_password: confirmPassword,
        }),
    });
}

export async function fetchMe() {
    return http('/auth/me');
}

