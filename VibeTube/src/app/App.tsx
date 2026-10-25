import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";

import Layout from "./Layout";
import { useAuth } from "./providers/AuthProvider";
import PageLoader from "../shared/ui/PageLoader/PageLoader";

// Страницы грузятся по требованию: в первый бандл не попадают тяжёлые
// Login/Register (WebGL-курсор), Upload, админка и т.д.
const Login = lazy(() => import("../pages/Login/Login"));
const Register = lazy(() => import("../pages/Register/Register"));
const Home = lazy(() => import("../pages/Home/Home"));
const Upload = lazy(() => import("../pages/Upload/Upload"));
const Watch = lazy(() => import("../pages/Watch/Watch"));
const Profile = lazy(() => import("../pages/Profile/Profile"));
const AdminPanel = lazy(() => import("../pages/Admin/AdminPanel"));
const SearchResults = lazy(() => import("../pages/SearchResult/SearchResult"));

const Protected = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader fullScreen />;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { profile, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (profile?.role !== 'admin') {
    return (
      <div style={{ padding: '50px', color: '#fff', textAlign: 'center', fontSize: '24px' }}>
        У вас нет прав доступа к этой странице
      </div>
    );
  }

  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader fullScreen />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<Protected><Layout /></Protected>}>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/video/:id" element={<Watch />} />
            <Route path="/channel/:id" element={<Profile />} />
            <Route path="/search" element={<SearchResults />}/>

            {/* Защищенный роут администратора */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
