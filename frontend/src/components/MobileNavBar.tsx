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
        <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
            {/* Top glow line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

            {/* Glassmorphism background */}
            <div className="bg-background/70 backdrop-blur-2xl pb-safe">
                <div className="flex items-center justify-around h-16 px-6">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <motion.button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                whileTap={{ scale: 0.85 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className={cn(
                                    "relative flex flex-col items-center justify-center gap-1 w-16 h-full",
                                    "transition-colors duration-200 outline-none",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )}
                            >
                                {/* Active pill indicator with gradient */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeTabPill"
                                        className="absolute top-1 w-12 h-8 rounded-full"
                                        style={{
                                            background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.06))',
                                        }}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}

                                {/* Icon with weight shift */}
                                <motion.div
                                    animate={{
                                        scale: isActive ? 1.05 : 1,
                                    }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    className="z-10"
                                >
                                    <Icon
                                        className="w-5 h-5"
                                        strokeWidth={isActive ? 2.5 : 1.8}
                                    />
                                </motion.div>

                                {/* Label with slide animation */}
                                <motion.span
                                    animate={{
                                        opacity: isActive ? 1 : 0.5,
                                        y: isActive ? 0 : 1,
                                    }}
                                    transition={{ duration: 0.2 }}
                                    className="text-[10px] font-semibold z-10 tracking-wide"
                                >
                                    {tab.label}
                                </motion.span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
