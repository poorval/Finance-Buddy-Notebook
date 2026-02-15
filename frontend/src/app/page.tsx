"use client"

import React, { useState, useEffect } from 'react';
import { Chat } from "@/components/chat";
import { DashboardView } from "@/components/DashboardView";
import { Header } from "@/components/Header";
import { WormholeAnimation } from "@/components/wormhole-animation";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChatRight, setIsChatRight] = useState(false);

  useEffect(() => {
    // Show animation for 2.5 seconds then fade out
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2500);

    // Check for storage preference
    const storedMode = localStorage.getItem("storage_mode");
    if (!storedMode) {
      // Delay slightly to let intro animation start/finish nicely
      setTimeout(() => setShowOnboarding(true), 1500);
    }

    return () => clearTimeout(timer);
  }, []);

  const handleTransactionComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleOnboardingComplete = (mode: string) => {
    localStorage.setItem("storage_mode", mode);
    setShowOnboarding(false);
    // Reload to apply storage settings globally via api.ts interceptor/header logic
    window.location.reload();
  };

  return (
    <main className="flex h-screen flex-col bg-background overflow-hidden relative">

      <OnboardingDialog
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onComplete={handleOnboardingComplete}
      />

      {/* Intro Animation Overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            className="absolute inset-0 z-50 pointer-events-none"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            <WormholeAnimation />
          </motion.div>
        )}
      </AnimatePresence>

      <Header />
      <div className="flex-1 w-full max-w-[1800px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">

        {/* Chatbot Panel */}
        <motion.div
          layout
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className={`lg:col-span-4 xl:col-span-3 h-full flex flex-col min-h-0 ${isChatRight ? 'order-2 lg:order-2' : 'order-1 lg:order-1'}`}
        >
          <div className="flex-1 min-h-0">
            <Chat onTransactionComplete={handleTransactionComplete} />
          </div>
        </motion.div>

        {/* Dashboard Panel */}
        <motion.div
          layout
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className={`lg:col-span-8 xl:col-span-9 h-full flex flex-col min-h-0 ${isChatRight ? 'order-1 lg:order-1' : 'order-2 lg:order-2'}`}
        >
          <ScrollArea className="flex-1 h-full pr-4">
            <DashboardView
              refreshTrigger={refreshTrigger}
              onLayoutChange={() => setIsChatRight(!isChatRight)}
              isChatRight={isChatRight}
            />
          </ScrollArea>
        </motion.div>

      </div>
    </main>
  );
}
