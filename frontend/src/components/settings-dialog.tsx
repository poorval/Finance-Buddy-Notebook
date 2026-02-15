"use client"

import * as React from "react"
import { Cloud, HardDrive, AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import api from "@/utils/api"

export function SettingsDialog() {
    const [mode, setMode] = React.useState("local")
    const [isSyncing, setIsSyncing] = React.useState(false)
    const [syncStatus, setSyncStatus] = React.useState<string | null>(null)
    const [showConfirm, setShowConfirm] = React.useState(false)
    const [pendingMode, setPendingMode] = React.useState<string | null>(null)

    React.useEffect(() => {
        const stored = localStorage.getItem("storage_mode")
        if (stored) setMode(stored)
    }, [])

    const confirmModeChange = (val: string) => {
        if (val === mode) return
        setPendingMode(val)
        setShowConfirm(true)
    }

    const executeModeChange = () => {
        if (pendingMode) {
            setMode(pendingMode)
            localStorage.setItem("storage_mode", pendingMode)
            window.location.reload()
        }
        setShowConfirm(false)
    }

    const handleSync = async () => {
        setIsSyncing(true)
        setSyncStatus(null)
        try {
            // Read local Dexie data
            const { db } = await import('@/lib/db');
            const localTransactions = await db.transactions.toArray();

            if (localTransactions.length === 0) {
                setSyncStatus("No local data to sync.")
                return
            }

            // Send each transaction to the cloud backend
            let synced = 0;
            for (const t of localTransactions) {
                try {
                    await api.post('/transactions', {
                        description: t.description,
                        amount: t.amount,
                        category: t.category,
                        split_details: t.split_details || "None"
                    });
                    synced++;
                } catch (err) {
                    console.error("Failed to sync transaction:", t, err);
                }
            }

            setSyncStatus(`Successfully synced ${synced}/${localTransactions.length} transactions to Cloud.`)
        } catch (error) {
            console.error("Sync failed:", error)
            setSyncStatus("Failed to sync data.")
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <a href="#" className="transition-colors hover:text-foreground">Settings</a>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                        Manage your data storage preferences.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="space-y-3">
                        <Label>Storage Location</Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                className={`cursor-pointer rounded-lg border-2 p-3 hover:bg-accent transition-all ${mode === 'local' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                                onClick={() => confirmModeChange('local')}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <HardDrive className="h-4 w-4" />
                                    <span className="font-semibold text-sm">Local</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Browser storage. Fast, private, but device-specific.
                                </div>
                            </div>
                            <div
                                className={`cursor-pointer rounded-lg border-2 p-3 hover:bg-accent transition-all ${mode === 'cloud' ? 'border-primary bg-primary/5' : 'border-muted'}`}
                                onClick={() => confirmModeChange('cloud')}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Cloud className="h-4 w-4" />
                                    <span className="font-semibold text-sm">Cloud</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Supabase cloud. Sync across devices.
                                </div>
                            </div>
                        </div>
                        {mode === 'local' && (
                            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-500 rounded text-xs">
                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>Caution: Clearing browser cache will delete local data.</span>
                            </div>
                        )}
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <Label>Data Sync</Label>
                        <p className="text-sm text-muted-foreground">
                            Move your local data to the cloud to keep it safe.
                        </p>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleSync}
                            disabled={isSyncing}
                        >
                            {isSyncing ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Syncing...
                                </>
                            ) : (
                                <>
                                    <Cloud className="mr-2 h-4 w-4" />
                                    Sync Local to Cloud
                                </>
                            )}
                        </Button>
                        {syncStatus && (
                            <p className="text-xs text-center text-muted-foreground mt-2">
                                {syncStatus}
                            </p>
                        )}
                    </div>
                </div>
                <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Switch Storage Mode?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will switch your data source to {pendingMode === 'local' ? 'Local Storage' : 'Cloud (Supabase)'}.
                                The page will reload and you may see different data.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={executeModeChange}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    )
}
