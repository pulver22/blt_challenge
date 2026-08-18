import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminPanel from './components/AdminPanel';
import SiteNav from './components/SiteNav';
import { ThemeProvider } from './context/ThemeContext';
import HomePage from './pages/HomePage';
import SubmissionPage from './pages/SubmissionPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <SiteNav />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/submissions/:id" element={<SubmissionPage />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Routes>
          </main>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
