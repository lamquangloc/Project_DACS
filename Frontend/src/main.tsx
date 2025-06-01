import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './styles/index.css';
import { Provider } from 'react-redux';
import { store } from './redux/store';

const clientId = '600910476922-vgfo69q8fiagt5majmfkshji1rso26u3.apps.googleusercontent.com'; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  </Provider>
); 