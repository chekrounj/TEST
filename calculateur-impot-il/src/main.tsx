import React from 'react';
import ReactDOM from 'react-dom/client';
import { CalculatorPage } from './ui/pages/CalculatorPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CalculatorPage />
  </React.StrictMode>,
);
