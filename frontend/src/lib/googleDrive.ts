import { db } from './db';
import 'dexie-export-import';

export const NEXT_PUBLIC_GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID";
let _accessToken: string | null = null;

export const loadGisScript = async (): Promise<void> => {
    if (typeof window === "undefined") return;
    if ((window as any).google?.accounts?.oauth2) return;
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

export const getAccessToken = async (prompt = false): Promise<string> => {
    if (_accessToken && !prompt) return _accessToken;
    await loadGisScript();

    return new Promise((resolve, reject) => {
        try {
            const client = (window as any).google.accounts.oauth2.initTokenClient({
                client_id: NEXT_PUBLIC_GOOGLE_CLIENT_ID,
                scope: "https://www.googleapis.com/auth/drive.appdata",
                callback: (response: any) => {
                    if (response.error !== undefined) {
                        reject(response);
                    } else {
                        _accessToken = response.access_token;
                        resolve(response.access_token);
                    }
                },
            });
            if (prompt) {
                client.requestAccessToken({ prompt: "consent" });
            } else {
                client.requestAccessToken({ prompt: "" });
            }
        } catch (err) {
            reject(err);
        }
    });
};

export const backupToDrive = async (): Promise<void> => {
    const token = await getAccessToken();
    const blob = await db.export();

    const metadata = {
        name: `backup-${new Date().toISOString()}.json`,
        parents: ['appDataFolder']
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: form
    });
    if (!res.ok) throw new Error("Failed to upload backup to Google Drive");
};

export const listBackups = async (): Promise<any[]> => {
    const token = await getAccessToken();
    const res = await fetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name,createdTime,size)', {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to list backups");
    const data = await res.json();
    return data.files || [];
};

export const restoreFromDrive = async (fileId: string): Promise<void> => {
    const token = await getAccessToken();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to download backup");
    const blob = await res.blob();

    await db.delete();
    await db.open();
    await db.import(blob);
};
