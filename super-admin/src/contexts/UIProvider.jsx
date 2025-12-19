import { createContext, useState } from 'react';

export const UIContext = createContext();

export default function UiProvider({children}) {
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
      {loading && <FullLoader message={loadingMessage} />}
    </UIContext.Provider>
  )
}
