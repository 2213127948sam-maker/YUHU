import { createRoot } from 'react-dom/client';
import { App } from './App';
import './terminal.css';
import { installCache } from './utils/pwa';
createRoot(document.getElementById('root')!).render(<App />);
void installCache();
