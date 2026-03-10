import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";

import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import Home from "../pages/Home/Home";
import Upload from "../pages/Upload/Upload";
import Watch from "../pages/Watch/Watch";
import Profile from "../pages/Profile/Profile";

import Layout from "./Layout";
import { useAuth } from "./providers/AuthProvider";
import SearchResults from "../pages/SearchResult/SearchResult";

const Protected = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return user ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* публичные страницы */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* защищенные страницы + layout */}
        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/video/:id" element={<Watch />} />
          <Route path="/channel/:id" element={<Profile />} />
          <Route path="/search" element={<SearchResults />}/>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}