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
import { Card } from "@/components/ui/card"

interface OnboardingDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onComplete: (mode: string) => void
}

export function OnboardingDialog({ open, onOpenChange, onComplete }: OnboardingDialogProps) {
    const [selectedMode, setSelectedMode] = React.useState<string | null>(null)

    const handleConfirm = () => {
        if (selectedMode) {
            onComplete(selectedMode)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] [&>button]:hidden">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Welcome to FrugalAgent
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        To get started, please choose how you would like to save your data.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Local Option */}
                    <Card
                        className={`relative p-4 cursor-pointer border-2 transition-all hover:bg-accent/50 ${selectedMode === 'local' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                        onClick={() => setSelectedMode('local')}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 p-2 rounded-lg ${selectedMode === 'local' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                <HardDrive className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold">Local Storage</h3>
                                <p className="text-sm text-muted-foreground">
                                    Data is stored securely in your browser. Fast and private, but specific to this device.
                                </p>
                                {selectedMode === 'local' && (
                                    <div className="flex items-start gap-2 pt-2 text-xs text-amber-600 dark:text-amber-500 font-medium">
                                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                        <span>Warning: Clearing browser data will delete your expenses.</span>
                                    </div>
                                )}
                            </div>
                            {selectedMode === 'local' && (
                                <div className="absolute top-4 right-4 text-primary">
                                    <Check className="h-5 w-5" />
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Cloud Option */}
                    <Card
                        className={`relative p-4 cursor-pointer border-2 transition-all hover:bg-accent/50 ${selectedMode === 'cloud' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                        onClick={() => setSelectedMode('cloud')}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 p-2 rounded-lg ${selectedMode === 'cloud' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                <Cloud className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-semibold">Cloud Sync</h3>
                                <p className="text-sm text-muted-foreground">
                                    Data is stored in the cloud (Supabase). Access your expenses from any device.
                                </p>
                            </div>
                            {selectedMode === 'cloud' && (
                                <div className="absolute top-4 right-4 text-primary">
                                    <Check className="h-5 w-5" />
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <DialogFooter>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedMode}
                        size="lg"
                        className="w-full sm:w-auto"
                    >
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
