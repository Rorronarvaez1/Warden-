import { useState, type FC } from 'react'
import './App.css'
import Login from './components/Login'

const App: FC = () => {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );

  if(token) {
    return (
      <div style={{ padding: '2rem'}}>
        <h1>Inicio de Sesión</h1>
        <button onClick={() => {
          localStorage.removeItem('token');
          setToken(null);
        }}>
        </button>
      </div>
    );
  }

  return <Login onSuccess={setToken} />;
  
};

export default App;
