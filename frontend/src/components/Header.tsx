"use client"

import React from 'react';
import { ModeToggle } from "@/components/mode-toggle"
import { UserProfile } from "@/components/user-profile"
import { SettingsDialog } from "@/components/settings-dialog"
import { useIsMobile } from '@/hooks/useIsMobile';

function getGreeting(): { text: string; emoji: string } {
    const hour = new Date().getHours();
    if (hour < 5) return { text: "Good Night", emoji: "🌙" };
    if (hour < 12) return { text: "Good Morning", emoji: "☀️" };
    if (hour < 17) return { text: "Good Afternoon", emoji: "🌤️" };
    if (hour < 21) return { text: "Good Evening", emoji: "🌆" };
    return { text: "Good Night", emoji: "🌙" };
}

export function Header() {
    const isMobile = useIsMobile();
    const greeting = getGreeting();

    return (
        <header className="flex items-center justify-between px-4 md:px-6 py-2.5 md:py-3 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 pt-safe border-b border-border/40 animate-fade-in">
            <div className="flex items-center gap-3 md:gap-4">
                {isMobile ? (
                    /* Mobile: Greeting replaces logo */
                    <div className="flex items-center gap-2">
                        <span className="text-xl">{greeting.emoji}</span>
                        <div>
                            <p className="text-sm font-semibold tracking-tight">{greeting.text}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">
                                {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Desktop: Full header */
                    <>
                        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
                            FrugalAgent
                        </h1>
                        <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
                            <a href="#" className="text-foreground transition-colors hover:text-foreground">Overview</a>
                            <a href="#" className="transition-colors hover:text-foreground">Transactions</a>
                            <SettingsDialog />
                        </nav>
                    </>
                )}
            </div>

            <div className="flex items-center gap-1.5 md:gap-4">
                {/* Mobile: compact controls */}
                {isMobile ? (
                    <>
                        <SettingsDialog />
                        <ModeToggle />
                        <UserProfile />
                    </>
                ) : (
                    /* Desktop: full controls */
                    <>
                        <ModeToggle />
                        <UserProfile />
                    </>
                )}
            </div>
        </header>
    );
}
