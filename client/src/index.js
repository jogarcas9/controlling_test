import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { StrictMode } from 'react';
import './i18n';
import { Provider } from 'react-redux';
import { store } from './store';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
); 