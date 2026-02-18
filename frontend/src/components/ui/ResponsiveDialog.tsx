"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/useIsMobile"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"

interface ResponsiveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    children: React.ReactNode
}

function ResponsiveDialog({ open, onOpenChange, children }: ResponsiveDialogProps) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                {children}
            </Drawer>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {children}
        </Dialog>
    )
}

function ResponsiveDialogContent({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof DialogContent>) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return (
            <DrawerContent className={className} {...(props as any)}>
                <div className="mx-auto w-full max-w-sm px-4 pb-6">
                    {children}
                </div>
            </DrawerContent>
        )
    }

    return (
        <DialogContent className={className} {...props}>
            {children}
        </DialogContent>
    )
}

function ResponsiveDialogHeader({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return <DrawerHeader className={className} {...props} />
    }

    return <DialogHeader className={className} {...props} />
}

function ResponsiveDialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogTitle>) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return <DrawerTitle className={className} {...(props as any)} />
    }

    return <DialogTitle className={className} {...props} />
}

function ResponsiveDialogDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogDescription>) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return <DrawerDescription className={className} {...(props as any)} />
    }

    return <DialogDescription className={className} {...props} />
}

function ResponsiveDialogFooter({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return <DrawerFooter className={className} {...props} />
    }

    return <DialogFooter className={className} {...props} />
}

function ResponsiveDialogTrigger({ ...props }: React.ComponentPropsWithoutRef<typeof DialogTrigger>) {
    const isMobile = useIsMobile()

    if (isMobile) {
        return <DrawerTrigger {...(props as any)} />
    }

    return <DialogTrigger {...props} />
}

export {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
    ResponsiveDialogTrigger,
}
