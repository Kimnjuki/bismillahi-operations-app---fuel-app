import React, { createContext, useContext, useCallback } from 'react';

interface TabNavigationContextType {
  switchTab: (tabKey: string) => void;
}

const TabNavigationContext = createContext<TabNavigationContextType | null>(null);

export function TabNavigationProvider({ children, value }: { children: React.ReactNode; value: TabNavigationContextType }) {
  return (
    <TabNavigationContext.Provider value={value}>
      {children}
    </TabNavigationContext.Provider>
  );
}

export function useTabNavigation() {
  const context = useContext(TabNavigationContext);
  if (!context) {
    throw new Error('useTabNavigation must be used within a TabNavigationProvider');
  }
  return context;
}