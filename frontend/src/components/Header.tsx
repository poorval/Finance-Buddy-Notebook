"use client"

import React from 'react';
import { ModeToggle } from "@/components/mode-toggle"
import { UserProfile } from "@/components/user-profile"
import { SettingsDialog } from "@/components/settings-dialog"
import { useIsMobile } from '@/hooks/useIsMobile';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

export function Header() {
    const isMobile = useIsMobile();

    return (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b px-4 md:px-6 h-14 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-safe">
            <div className="flex items-center gap-3">
                {isMobile ? (
                    <h1 className="text-lg font-semibold tracking-tight">{getGreeting()}</h1>
                ) : (
                    <>
                        <h1 className="text-lg font-semibold tracking-tight">FrugalAgent</h1>
                        <nav className="hidden md:flex items-center gap-4 text-sm text-muted-foreground ml-4">
                            <a href="#" className="text-foreground transition-colors">Overview</a>
                            <a href="#" className="transition-colors hover:text-foreground">Transactions</a>
                            <SettingsDialog />
                        </nav>
                    </>
                )}
            </div>
            <div className="flex items-center gap-2">
                {isMobile && <SettingsDialog />}
                <ModeToggle />
                <UserProfile />
            </div>
        </header>
    );
}
