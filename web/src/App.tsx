import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import Dashboard from './pages/Dashboard';
import Tools from './pages/Tools';
import ToolsModal from './pages/ToolsModal';
import ToolsStack from './pages/ToolsStack';
import ToolsTab from './pages/ToolsTab';
import Settings from './pages/Settings';
import { api } from './lib/api';

function AppContent() {
  const { data: configResponse } = useQuery({
    queryKey: ['config'],
    queryFn: api.config.get,
    staleTime: Infinity,
  });

  const config = configResponse?.data;
  
  if (config?.theme) {
    const applyTheme = (theme: string) => {
      const isDark = theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    
    applyTheme(config.theme);
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (config.theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tools" element={<ToolsTab />} />
        <Route path="/tools/simple" element={<Tools />} />
        <Route path="/tools/modal" element={<ToolsModal />} />
        <Route path="/tools/stack" element={<ToolsStack />} />
        <Route path="/skills" element={<Navigate to="/tools" replace />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
