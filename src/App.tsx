import { LoaderCircle } from "lucide-react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import Layout from "./components/Layout";
import { AuthProvider, useAuth } from "./lib/auth";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import ReportPage from "./pages/ReportPage";
import UploadPage from "./pages/UploadPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireLogin />}>
          <Route path="/" element={<UploadPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

// Every page except /login needs a logged-in user.
function RequireLogin() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-rose-500">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Layout />;
}
