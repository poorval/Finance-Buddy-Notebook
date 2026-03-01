"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window !== "undefined" && "serviceWorker" in navigator) {
            const registerSW = async () => {
                try {
                    const reg = await navigator.serviceWorker.register("/sw.js")
                    console.log("[SW] Registered:", reg.scope)
                } catch (err) {
                    console.warn("[SW] Registration failed:", err)
                }
            }

            if (document.readyState === "complete") {
                registerSW()
            } else {
                window.addEventListener("load", registerSW)
                return () => window.removeEventListener("load", registerSW)
            }
        }
    }, [])

    return null
}
