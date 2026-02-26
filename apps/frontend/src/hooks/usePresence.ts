import { useState, useEffect } from 'react';
import api from '@/services/api';

export function usePresence(projectId: string | undefined) {
    const [onlineCount, setOnlineCount] = useState<number>(0);

    useEffect(() => {
        if (!projectId) return;

        const heartbeat = async () => {
            try {
                const response = await api.post(`/presence/${projectId}/heartbeat`);
                setOnlineCount(response.data.onlineCount);
            } catch (error) {
                console.error("Error sending heartbeat:", error);
            }
        };

        // Initial call
        heartbeat();

        // Interval
        const intervalId = setInterval(heartbeat, 30000); // 30 seconds

        return () => clearInterval(intervalId);
    }, [projectId]);

    return onlineCount;
}
