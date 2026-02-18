"use client"

import { useState, useEffect } from "react"
import { Settings, Cloud, HardDrive, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogDescription,
    ResponsiveDialogTrigger,
} from "@/components/ui/ResponsiveDialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { getService } from "@/services/dataService"
import api from "@/utils/api"

export function SettingsDialog() {
    const [open, setOpen] = useState(false)
    const [storageMode, setStorageMode] = useState<"local" | "cloud">("local")
    const [syncing, setSyncing] = useState(false)
    const [pendingMode, setPendingMode] = useState<"local" | "cloud" | null>(null)

    useEffect(() => {
        const mode = localStorage.getItem("storage_mode") as "local" | "cloud" || "local"
        setStorageMode(mode)
    }, [])

    const handleModeSelect = (mode: "local" | "cloud") => {
        if (mode !== storageMode) {
            setPendingMode(mode)
        }
    }

    const confirmModeChange = () => {
        if (pendingMode) {
            localStorage.setItem("storage_mode", pendingMode)
            setStorageMode(pendingMode)
            setPendingMode(null)
            window.location.reload()
        }
    }

    const handleSync = async () => {
        setSyncing(true)
        try {
            const service = getService()
            const txns = await service.getTransactions()
            if (txns.length > 0) {
                await api.post("/transactions", txns)
            }
            alert("Sync completed successfully!")
        } catch (err) {
            console.error("Sync failed:", err)
            alert("Sync failed. Please try again.")
        } finally {
            setSyncing(false)
        }
    }

    return (
        <ResponsiveDialog open={open} onOpenChange={setOpen}>
            <ResponsiveDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 h-9 touch-target">
                    <Settings className="h-4 w-4" />
                    <span className="hidden md:inline">Settings</span>
                </Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent className="sm:max-w-[425px]">
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle>Settings</ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                        Manage your data storage and sync preferences.
                    </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <h4 className="font-medium text-sm mb-3">Data Storage</h4>
                        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                            <AlertDialog open={pendingMode === "local"} onOpenChange={(open) => { if (!open) setPendingMode(null) }}>
                                <AlertDialogTrigger asChild>
                                    <button
                                        onClick={() => handleModeSelect("local")}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all touch-target ${storageMode === "local"
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-muted hover:border-primary/40"
                                            }`}
                                    >
                                        <HardDrive className={`h-6 w-6 ${storageMode === "local" ? "text-primary" : "text-muted-foreground"}`} />
                                        <span className="font-medium text-sm">Local</span>
                                        <span className="text-xs text-muted-foreground text-center">Browser storage</span>
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Switch to Local Storage?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Your data will be stored locally in your browser. Make sure to sync before switching.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={confirmModeChange}>Confirm</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog open={pendingMode === "cloud"} onOpenChange={(open) => { if (!open) setPendingMode(null) }}>
                                <AlertDialogTrigger asChild>
                                    <button
                                        onClick={() => handleModeSelect("cloud")}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all touch-target ${storageMode === "cloud"
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-muted hover:border-primary/40"
                                            }`}
                                    >
                                        <Cloud className={`h-6 w-6 ${storageMode === "cloud" ? "text-primary" : "text-muted-foreground"}`} />
                                        <span className="font-medium text-sm">Cloud</span>
                                        <span className="text-xs text-muted-foreground text-center">Supabase sync</span>
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Switch to Cloud Storage?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Your data will be stored in the cloud via Supabase.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={confirmModeChange}>Confirm</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>

                    <div className="pt-2 border-t">
                        <h4 className="font-medium text-sm mb-3">Data Sync</h4>
                        <Button
                            onClick={handleSync}
                            disabled={syncing}
                            variant="outline"
                            className="w-full h-11 touch-target"
                        >
                            <RefreshCcw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Syncing...' : 'Sync to Cloud'}
                        </Button>
                    </div>
                </div>
            </ResponsiveDialogContent>
        </ResponsiveDialog>
    )
}
