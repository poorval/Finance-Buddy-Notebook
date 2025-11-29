"use client"

import React, { useState } from 'react';
import { Chat } from "@/components/chat";
import { DashboardView } from "@/components/DashboardView";
import { Header } from "@/components/Header";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTransactionComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <main className="flex h-screen flex-col bg-background overflow-hidden">
      <Header />
      <div className="flex-1 w-full max-w-[1800px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">

        {/* Left Panel: Chatbot */}
        <div className="lg:col-span-4 xl:col-span-3 h-full flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <Chat onTransactionComplete={handleTransactionComplete} />
          </div>
        </div>

        {/* Right Panel: Dashboard */}
        <div className="lg:col-span-8 xl:col-span-9 h-full flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <DashboardView refreshTrigger={refreshTrigger} />
          </div>
        </div>

      </div>
    </main>
  );
}
