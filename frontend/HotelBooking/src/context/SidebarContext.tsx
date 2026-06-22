"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "@/app/i18n";

type SidebarContextType = {
  mobileOpen: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarContextType>({
  mobileOpen: false,
  toggleMobile: () => {},
  closeMobile: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMobile = useCallback(() => setMobileOpen(v => !v), []);
  const closeMobile  = useCallback(() => setMobileOpen(false), []);
  return (
    <SidebarContext.Provider value={{ mobileOpen, toggleMobile, closeMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
