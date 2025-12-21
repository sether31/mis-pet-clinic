import { createContext, useState } from 'react';
// component
import FullScreenLoader from '../components/FullScreenLoader';

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
      {loading && <FullScreenLoader message={loadingMessage} />}
    </UIContext.Provider>
  )
}
