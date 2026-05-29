import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders the login screen for unauthenticated admins', () => {
    render(<App />);
    expect(screen.getByText(/secure sign in/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login to admin panel/i })).toBeInTheDocument();
  });
});
