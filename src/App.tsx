import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { Toaster } from 'sonner';
import WelcomePage from '@/pages/WelcomePage';
import DashboardPage from '@/pages/DashboardPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#001a33] via-[#002244] to-[#001133]">
        <div className="text-center space-y-4">
          <img 
            src="https://cdn-ai.onspace.ai/onspace/files/35xco99wMUjf3UNXSy6ujS/19ef44eb5510d6af4eae6aae541fcbbc~2.jpg"
            alt="PRIMIS AI"
            className="w-24 h-24 mx-auto object-contain animate-pulse-glow"
          />
          <p className="text-primary">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/welcome" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-[#001a33] via-[#002244] to-[#001133]">
        <div className="text-center space-y-4">
          <img 
            src="https://cdn-ai.onspace.ai/onspace/files/35xco99wMUjf3UNXSy6ujS/19ef44eb5510d6af4eae6aae541fcbbc~2.jpg"
            alt="PRIMIS AI"
            className="w-24 h-24 mx-auto object-contain animate-pulse-glow"
          />
          <p className="text-primary">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <Navigate to="/" /> : <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/welcome"
            element={
              <PublicRoute>
                <WelcomePage />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
