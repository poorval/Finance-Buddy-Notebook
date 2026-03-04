"use client"

import * as React from "react"
import { Cloud, HardDrive, AlertTriangle, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface OnboardingDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onComplete: (mode: string) => void
}

export function OnboardingDialog({ open, onOpenChange, onComplete }: OnboardingDialogProps) {
    const [selectedMode, setSelectedMode] = React.useState<string | null>(null)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] [&>button]:hidden">
                <DialogHeader>
                    <DialogTitle className="text-xl">Welcome to FrugalAgent</DialogTitle>
                    <DialogDescription>
                        Choose how you'd like to store your data.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 py-4">
                    <button
                        className={cn(
                            "relative flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                            selectedMode === 'local' ? "border-primary bg-muted/50" : "border-border hover:bg-muted/50"
                        )}
                        onClick={() => setSelectedMode('local')}
                    >
                        <HardDrive className={cn("h-5 w-5 mt-0.5 shrink-0", selectedMode === 'local' ? "text-foreground" : "text-muted-foreground")} />
                        <div className="space-y-1 flex-1">
                            <p className="text-sm font-semibold leading-none">Local Storage</p>
                            <p className="text-sm text-muted-foreground">Stored in your browser. Fast and private, but device-specific.</p>
                            {selectedMode === 'local' && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-1">
                                    <AlertTriangle className="h-3 w-3" /> Clearing browser data will delete your expenses.
                                </p>
                            )}
                        </div>
                        {selectedMode === 'local' && (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                        )}
                    </button>

                    <button
                        className={cn(
                            "relative flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors",
                            selectedMode === 'cloud' ? "border-primary bg-muted/50" : "border-border hover:bg-muted/50"
                        )}
                        onClick={() => setSelectedMode('cloud')}
                    >
                        <Cloud className={cn("h-5 w-5 mt-0.5 shrink-0", selectedMode === 'cloud' ? "text-foreground" : "text-muted-foreground")} />
                        <div className="space-y-1 flex-1">
                            <p className="text-sm font-semibold leading-none">Cloud Sync</p>
                            <p className="text-sm text-muted-foreground">Stored in the cloud. Access from any device.</p>
                        </div>
                        {selectedMode === 'cloud' && (
                            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                        )}
                    </button>
                </div>

                <DialogFooter>
                    <Button onClick={() => selectedMode && onComplete(selectedMode)} disabled={!selectedMode} className="w-full sm:w-auto">
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
