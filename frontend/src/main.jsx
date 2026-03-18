import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Providers from './app/providers';
import './styles/globals.css';
import './styles/components.css';
import './styles/clients.css';
import './styles/users.css';
import './styles/projects.css';
import './styles/auth.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Providers />
  </StrictMode>
);
