import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../../pages/Login';
import { mockAPI } from '../mocks/mockAxios';

describe('Login Page', () => {
  beforeEach(() => {
    mockAPI.onPost('/api/auth/login', {
      token: 'test_token',
    });
  });

  afterEach(() => {
    mockAPI.reset();
  });

  it('should display a login form', () => {
    render(<Login />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should login the user with valid credentials', async () => {
    render(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    const successMessage = await screen.findByText(/login successful/i);
    expect(successMessage).toBeInTheDocument();
  });

  it('should display an error for invalid credentials', async () => {
    mockAPI.onPost('/api/auth/login').reply(401, { error: 'Invalid credentials' });
    render(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'wronguser@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    const errorMessage = await screen.findByText(/invalid credentials/i);
    expect(errorMessage).toBeInTheDocument();
  });
});