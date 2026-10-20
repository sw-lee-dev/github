import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import { Loading } from './components/Loading';
import ApprovalsPage from './pages/ApprovalsPage';
import CostSheetDetailPage from './pages/CostSheetDetailPage';
import CostSheetFormPage from './pages/CostSheetFormPage';
import CostSheetListPage from './pages/CostSheetListPage';
import LoginPage from './pages/LoginPage';
import MaterialsPage from './pages/MaterialsPage';
import ProductsPage from './pages/ProductsPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<CostSheetListPage />} />
        <Route path="cost-sheets/new" element={<CostSheetFormPage />} />
        <Route path="cost-sheets/:id" element={<CostSheetDetailPage />} />
        <Route path="cost-sheets/:id/edit" element={<CostSheetFormPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="products" element={<ProductsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
