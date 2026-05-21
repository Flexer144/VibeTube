import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import Home from "../pages/Home/Home";
import Upload from "../pages/Upload/Upload";
import Watch from "../pages/Watch/Watch";
import Profile from "../pages/Profile/Profile";
import AdminPanel from "../pages/Admin/AdminPanel"; // Создадим в следующей части

import Layout from "./Layout";
import { useAuth } from "./providers/AuthProvider";
import SearchResults from "../pages/SearchResult/SearchResult";

const Protected = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { profile, loading } = useAuth();
  
  if (loading) return null;
  
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
      </Routes>
    </BrowserRouter>
  );
}