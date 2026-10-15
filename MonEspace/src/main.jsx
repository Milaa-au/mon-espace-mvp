import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Login from "../frontend/src/pages/Login.jsx";
import Register from "../frontend/src/pages/Register.jsx";
import "./app.css";

function AuthLayout() {
  const location = useLocation();

  return (
    <main className="app-shell">
      <section className="auth-card">
        <div className="brand">
          <span className="brand-mark">M</span>
          <div>
            <p className="eyebrow">MonEspace</p>
            <h1>Votre espace, à votre rythme.</h1>
          </div>
        </div>

        <nav className="tabs" aria-label="Choisir une opération">
          <Link className={location.pathname === "/login" ? "active" : ""} to="/login">
            Se connecter
          </Link>
          <Link className={location.pathname === "/register" ? "active" : ""} to="/register">
            S’inscrire
          </Link>
        </nav>

        <div className="form-panel">
          <Outlet />
        </div>
      </section>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.querySelector("#app")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
