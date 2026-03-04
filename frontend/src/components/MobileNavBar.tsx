"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { Home, MessageCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileTab = 'home' | 'chat' | 'analytics';

interface MobileNavBarProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
}

const tabs = [
    { id: 'home' as MobileTab, label: 'Home', icon: Home },
    { id: 'chat' as MobileTab, label: 'Chat', icon: MessageCircle },
    { id: 'analytics' as MobileTab, label: 'Analytics', icon: BarChart3 },
];

export function MobileNavBar({ activeTab, onTabChange }: MobileNavBarProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-safe">
            <div className="flex items-center justify-around h-14">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <motion.button
                            key={tab.id}
                            whileTap={{ scale: 0.85 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors touch-target",
                                isActive ? "text-foreground" : "text-muted-foreground"
                            )}
                        >
                            <motion.div
                                animate={isActive ? { y: -2 } : { y: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            >
                                <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
                            </motion.div>
                            <span className={cn("text-[10px]", isActive ? "font-semibold" : "font-medium")}>
                                {tab.label}
                            </span>
                            {isActive && (
                                <motion.div
                                    layoutId="mobile-nav-indicator"
                                    className="absolute top-0 w-8 h-1 rounded-b-full bg-foreground"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>
        </nav>
    );
}
