import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the login screen when not authenticated', () => {
  render(<App />);
  expect(screen.getByText(/Connexion/i)).toBeInTheDocument();
});
