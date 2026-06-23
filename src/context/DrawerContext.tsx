import React, {createContext, useCallback, useContext, useState} from 'react';
import {AppDrawer} from '../components/AppDrawer';

type DrawerContextValue = {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const DrawerContext = createContext<DrawerContextValue>({
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerContext);

export const DrawerProvider = ({children}: {children: React.ReactNode}) => {
  const [isOpen, setIsOpen] = useState(false);
  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);

  return (
    <DrawerContext.Provider value={{isOpen, openDrawer, closeDrawer}}>
      {children}
      <AppDrawer open={isOpen} onClose={closeDrawer} />
    </DrawerContext.Provider>
  );
};
