import "@/styles/globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/layout/Sidebar";
import type { Metadata } from "next";
import GuestChatWidget from "@/components/GuestChatWidget";
import { SidebarProvider } from "@/context/SidebarContext";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import "./i18n";

export const metadata: Metadata = {
    title: "LuxStay — Hotel Management",
    description: "Professional hotel booking and management platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            {/* Prevent dark-mode flash on first load */}
            <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}` }} />
        </head>
        <body className="antialiased">
        <SidebarProvider>
          <Header />
          <Sidebar />
          <main className="main-content">
              <ErrorBoundary>
                  {children}
              </ErrorBoundary>
          </main>
          <GuestChatWidget />
        </SidebarProvider>
        </body>
        </html>
    );
}
