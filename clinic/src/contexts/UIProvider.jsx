import { createContext, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// component
import FullScreenLoader from '../components/FullLoader';

export const UIContext = createContext();

export default function UIProvider({children}) {
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const showLoader = (msg = 'Loading...') => {
    setLoadingMessage(msg);
    setLoading(true);
  };

  const hideLoader = () => {
    setLoading(false);
    setLoadingMessage('');
  };

  return (
    <UIContext.Provider value={{showLoader, hideLoader}}>
      {children}
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        style={{ zIndex: 9999 }} 
      />
      {loading && <FullScreenLoader message={loadingMessage} />}
    </UIContext.Provider>
  )
}
