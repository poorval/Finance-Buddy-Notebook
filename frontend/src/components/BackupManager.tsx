"use client"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { listBackups, backupToDrive, restoreFromDrive, getAccessToken } from "@/lib/googleDrive"
import { format } from "date-fns"
import { CloudUpload, CloudDownload, Calendar, Loader2 } from "lucide-react"

// Auto-backup Debounce Helper
let _autoBackupTimeout: NodeJS.Timeout | null = null;
export const triggerAutoBackup = () => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("gdrive_connected") !== "true") return;

    if (_autoBackupTimeout) clearTimeout(_autoBackupTimeout);
    _autoBackupTimeout = setTimeout(() => {
        backupToDrive().catch(err => console.error("Auto-backup failed:", err));
    }, 10000); // Debounce to 10 seconds
};

export function BackupManager({ onRestoreComplete }: { onRestoreComplete?: () => void }) {
    const [backups, setBackups] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [connected, setConnected] = useState(false)

    useEffect(() => {
        if (localStorage.getItem("gdrive_connected") === "true") {
            setConnected(true)
            fetchBackups()
        }
    }, [])

    const handleConnect = async () => {
        try {
            setLoading(true)
            await getAccessToken(true)
            localStorage.setItem("gdrive_connected", "true")
            setConnected(true)
            await fetchBackups()
        } catch (err) {
            console.error("Connection failed", err)
            // User denied or closed popup
            if (err && typeof err === 'object' && 'error' in err) {
                console.warn("User aborted connection flow");
                return;
            }
            alert("Failed to connect to Google Drive. Check console.")
        } finally {
            setLoading(false)
        }
    }

    const fetchBackups = async () => {
        try {
            setLoading(true)
            const files = await listBackups()
            // sort by created time desc
            files.sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime())
            setBackups(files)
        } catch (err) {
            console.error("Fetch backups failed", err)
        } finally {
            setLoading(false)
        }
    }

    const handleBackup = async () => {
        try {
            setLoading(true)
            await backupToDrive()
            setTimeout(fetchBackups, 1500) // Give Drive a moment to index
            alert("Successfully backed up to Google Drive!")
        } catch (err) {
            console.error("Backup failed", err)
            alert("Backup failed. Check console.")
        } finally {
            setLoading(false)
        }
    }

    const handleRestore = async (fileId: string) => {
        if (!confirm("Are you sure? This will OVERWRITE all your current data!")) return
        try {
            setLoading(true)
            await restoreFromDrive(fileId)
            alert("Successfully restored from Google Drive!")
            if (onRestoreComplete) onRestoreComplete()
            window.location.reload()
        } catch (err) {
            console.error("Restore failed", err)
            alert("Restore failed. Check console.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-medium">Google Drive Backup</h4>
            {!connected ? (
                <Button onClick={handleConnect} disabled={loading} variant="outline" className="w-full">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Connect Google Drive
                </Button>
            ) : (
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Button onClick={handleBackup} disabled={loading} className="w-full" variant="outline">
                            <CloudUpload className="mr-2 h-4 w-4" />
                            Backup Now
                        </Button>
                        <Button onClick={fetchBackups} disabled={loading} variant="ghost" size="icon">
                            <Calendar className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        <p className="text-xs text-muted-foreground font-semibold">Previous Backups:</p>
                        {backups.length === 0 ? (
                            <p className="text-xs text-muted-foreground opacity-70">No backups found.</p>
                        ) : (
                            backups.map(b => (
                                <div key={b.id} className="flex items-center justify-between bg-muted/30 p-2 rounded-md border text-sm mb-2">
                                    <div className="flex flex-col">
                                        <span>{format(new Date(b.createdTime), "yyyy-MM-dd HH:mm")}</span>
                                        <span className="text-xs text-muted-foreground">{(Number(b.size) / 1024).toFixed(1)} KB</span>
                                    </div>
                                    <Button size="sm" variant="secondary" onClick={() => handleRestore(b.id)} disabled={loading}>
                                        <CloudDownload className="h-4 w-4 mr-1" /> Restore
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
