import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 导入 Ant Design 样式
import 'antd/dist/reset.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
