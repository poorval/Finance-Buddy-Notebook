"use client"

import * as React from "react"
import { Cloud, HardDrive, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function StorageToggle() {
    const [mode, setMode] = React.useState("local")

    React.useEffect(() => {
        const stored = localStorage.getItem("storage_mode")
        if (stored) setMode(stored)
    }, [])

    const handleModeChange = (val: string) => {
        setMode(val)
        localStorage.setItem("storage_mode", val)
        window.location.reload()
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
                    {mode === "cloud" ? <Cloud className="h-4 w-4" /> : <HardDrive className="h-4 w-4" />}
                    <span className="sr-only">Toggle storage mode</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Storage Mode</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={mode} onValueChange={handleModeChange}>
                    <DropdownMenuRadioItem value="local">
                        <HardDrive className="mr-2 h-4 w-4" />
                        Local (Browser)
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="cloud">
                        <Cloud className="mr-2 h-4 w-4" />
                        Cloud (Supabase)
                    </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <div className="p-2 text-xs text-muted-foreground bg-muted/30 rounded-md m-1 flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                        Warning: Clearing browser site data or cache will wipe out data saved in Local mode.
                    </span>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
