import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [pending, setPending] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // 화면 이동 시마다 결재 대기 건수 갱신
  useEffect(() => {
    setMenuOpen(false);
    api.approvalCount().then((r) => setPending(r.pending)).catch(() => {});
  }, [location.pathname]);

  const link = ({ isActive }: { isActive: boolean }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <>
      <nav className="navbar navbar-expand-md navbar-dark app-navbar sticky-top">
        <div className="container-xl">
          <NavLink to="/" className="navbar-brand fw-semibold">
            <i className="bi bi-clipboard2-check me-2" />
            제조원가 결재
          </NavLink>
          <button className="navbar-toggler" type="button" aria-label="메뉴" onClick={() => setMenuOpen((v) => !v)}>
            <span className="navbar-toggler-icon" />
          </button>
          <div className={`collapse navbar-collapse${menuOpen ? ' show' : ''}`}>
            <ul className="navbar-nav me-auto">
              <li className="nav-item">
                <NavLink to="/" end className={link}>원가계산서</NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/approvals" className={link}>
                  결재함
                  {pending > 0 && <span className="badge rounded-pill text-bg-warning ms-1">{pending}</span>}
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/materials" className={link}>원재료·포장재</NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/products" className={link}>제품</NavLink>
              </li>
            </ul>
            <div className="d-flex align-items-center gap-2 text-white-50 small py-2 py-md-0">
              <i className="bi bi-person-circle" />
              <span className="text-white">
                {user?.name} {user?.position}
              </span>
              <span>({user?.roleLabel})</span>
              <button className="btn btn-sm btn-outline-light ms-2" onClick={logout}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container-xl py-4">
        <Outlet />
      </main>
    </>
  );
}
