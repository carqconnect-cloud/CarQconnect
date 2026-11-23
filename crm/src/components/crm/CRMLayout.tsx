import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import TopProgressBar from './TopProgressBar';

interface CRMLayoutProps {
  children: ReactNode;
}

const CRMLayout = ({ children }: CRMLayoutProps) => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-black overflow-hidden font-sans">
      <TopProgressBar />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 [&::-webkit-scrollbar]:hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CRMLayout;
