"use client"

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Chat } from "@/components/chat";
import { DashboardView } from "@/components/DashboardView";
import { Header } from "@/components/Header";
import { WormholeAnimation } from "@/components/wormhole-animation";
import { OnboardingDialog } from "@/components/onboarding-dialog";
import { MobileNavBar, MobileTab } from "@/components/MobileNavBar";
import { useIsMobile } from "@/hooks/useIsMobile";
import { AnimatePresence, motion } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

const AnalyticsView = lazy(() => import('@/components/AnalyticsView'));

const TAB_ORDER: MobileTab[] = ['home', 'chat', 'analytics'];

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChatRight, setIsChatRight] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('home');
  const prevTabRef = useRef<MobileTab>('home');
  const isMobile = useIsMobile();

  // Track direction for slide animation
  const getDirection = (nextTab: MobileTab): number => {
    const prevIndex = TAB_ORDER.indexOf(prevTabRef.current);
    const nextIndex = TAB_ORDER.indexOf(nextTab);
    return nextIndex > prevIndex ? 1 : -1;
  };

  const [slideDirection, setSlideDirection] = useState(0);

  const handleTabChange = (tab: MobileTab) => {
    setSlideDirection(getDirection(tab));
    prevTabRef.current = mobileTab;
    setMobileTab(tab);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2500);

    const storedMode = localStorage.getItem("storage_mode");
    if (!storedMode) {
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
    window.location.reload();
  };

  // Spring-based slide variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -60 : 60,
      opacity: 0,
    }),
  };

  return (
    <main className="flex h-[100dvh] flex-col bg-background overflow-hidden relative">

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

      {/* Mobile Layout */}
      {isMobile ? (
        <div className="flex-1 min-h-0 pb-nav">
          <AnimatePresence mode="wait" custom={slideDirection}>
            {mobileTab === 'home' && (
              <motion.div
                key="home"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
                className="h-full overflow-y-auto scroll-smooth-touch"
              >
                <DashboardView
                  refreshTrigger={refreshTrigger}
                  isChatRight={false}
                  isMobile={true}
                />
              </motion.div>
            )}
            {mobileTab === 'chat' && (
              <motion.div
                key="chat"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
                className="h-full flex flex-col"
              >
                <Chat onTransactionComplete={handleTransactionComplete} />
              </motion.div>
            )}
            {mobileTab === 'analytics' && (
              <motion.div
                key="analytics"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
                className="h-full overflow-y-auto scroll-smooth-touch p-4"
              >
                <Suspense fallback={
                  <div className="flex h-[400px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                }>
                  <AnalyticsView />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
          <MobileNavBar activeTab={mobileTab} onTabChange={handleTabChange} />
        </div>
      ) : (
        /* Desktop Layout — unchanged */
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
      )}
    </main>
  );
}
