import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ErrorAlert, errMsg } from '../components/Loading';

const DEMO_ACCOUNTS = [
  { username: 'writer', label: '김원가 대리 (원가담당)' },
  { username: 'leader', label: '이팀장 팀장 (1차 결재)' },
  { username: 'plant', label: '박공장 공장장 (2차 결재)' },
  { username: 'exec', label: '최상무 상무 (최종 결재)' },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card shadow login-card">
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <i className="bi bi-clipboard2-check text-brand" style={{ fontSize: '2.5rem' }} />
            <h1 className="h4 mt-2 mb-0">식품 제조원가 결재</h1>
            <p className="text-muted small mb-0">원가계산서 작성부터 승인까지</p>
          </div>
          <ErrorAlert message={error} />
          <form onSubmit={submit} className="vstack gap-3">
            <div>
              <label htmlFor="username" className="form-label">아이디</label>
              <input id="username" className="form-control" autoComplete="username" value={username}
                onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="password" className="form-label">비밀번호</label>
              <input id="password" type="password" className="form-control" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <button className="btn btn-brand w-100" disabled={busy}>
              {busy && <span className="spinner-border spinner-border-sm me-2" />}로그인
            </button>
          </form>

          <hr className="my-4" />
          <div className="small text-muted mb-2">테스트 계정 (비밀번호 1234)</div>
          <div className="vstack gap-1">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.username} type="button" className="btn btn-sm btn-outline-secondary text-start"
                onClick={() => { setUsername(a.username); setPassword('1234'); }}>
                <code className="me-2">{a.username}</code>{a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
