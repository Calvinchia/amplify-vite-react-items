import React, { createContext, useEffect, useRef, useState, useContext, ReactNode } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

const WEBSOCKET_URL = 'wss://6z72j61l2b.execute-api.ap-southeast-1.amazonaws.com/dev/';

interface WebSocketContextType {
    connected: boolean;
    messages: any[];
    sendMessage: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
    children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
    const ws = useRef<WebSocket | null>(null);
    const [connected, setConnected] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [token, setToken] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [attemptingReconnection, setAttemptingReconnection] = useState(false);
    
    // Reconnection delay to avoid immediate reconnecting
    const RECONNECT_DELAY = 5000; // 5 seconds

    // Function to refresh the JWT token
    const refreshJwtToken = async () => {
        try {
            const session = await fetchAuthSession();

            // Check if session.tokens exists and is valid
            if (session && session.tokens && session.tokens.idToken) {
                const newToken = String(session.tokens.idToken);  // Convert idToken to a string explicitly
                setToken(newToken);
                setIsLoggedIn(true);
            } else {
                throw new Error('Session tokens are undefined.');
            }

        } catch (error) {
            console.error('Error refreshing JWT token:', error);
            setIsLoggedIn(false);
        }
    };

    // Function to connect to the WebSocket
    const connectWebSocket = () => {
        if (!token || !isLoggedIn || ws.current !== null) {
            return;
        }

        const websocketUrl = `${WEBSOCKET_URL}?token=${token}`;
        ws.current = new WebSocket(websocketUrl);

        ws.current.onopen = () => {
            console.log('WebSocket connected');
            setConnected(true);
            setAttemptingReconnection(false);
        };

        ws.current.onmessage = (event) => {
            const messageData = JSON.parse(event.data);
            console.log('WebSocket message received:', messageData);
            setMessages((prevMessages) => [...prevMessages, messageData]);
        };

        ws.current.onclose = () => {
            console.log('WebSocket closed');
            setConnected(false);
            ws.current = null;

            // Attempt to reconnect with a delay
            if (!attemptingReconnection) {
                setAttemptingReconnection(true);
                setTimeout(() => {
                    console.log('Attempting to reconnect WebSocket...');
                    connectWebSocket();
                }, RECONNECT_DELAY);
            }
        };

        ws.current.onerror = (error) => {
            console.error('WebSocket error:', error);
            ws.current?.close(); // Close the socket on error
        };
    };

    useEffect(() => {
        // Refresh JWT token only if token is not available yet
        if (!token) {
            refreshJwtToken();
        }
    
        // Only connect WebSocket if the token and login status are valid, and we aren't already connected
        if (token && isLoggedIn && !connected) {
            console.log("Connecting WebSocket");
            // connectWebSocket(); // Uncomment this to actually connect the WebSocket
        }
    
        return () => {
            if (ws.current) {
                ws.current.close(); // Clean up WebSocket on unmount
            }
        };
    }, [token, isLoggedIn, connected]); // Include 'connected' to prevent reconnection when already connected
    

    const sendMessage = (message: any) => {
        if (ws.current && connected) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not connected. Cannot send message.');
        }
    };

    return (
        <WebSocketContext.Provider value={{ connected, messages, sendMessage }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};
