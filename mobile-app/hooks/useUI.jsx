import { useContext } from 'react';
import { UIContext } from '../context/UIProvider'; 

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }

  return context;
};