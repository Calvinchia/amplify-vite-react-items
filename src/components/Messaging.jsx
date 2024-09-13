import React, { useEffect, useState, useRef } from 'react';
import { Amplify } from 'aws-amplify';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { getCurrentUser } from 'aws-amplify/auth';
import { fetchAuthSession } from 'aws-amplify/auth';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { Input, Button, Card, Layout, Typography, Space, Avatar } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { API_URL, WEBSOCKET_URL, S3_BASE_URL } from '../constants';
import { useLocation } from 'react-router-dom';
import 'antd/dist/reset.css';
import '../Messaging.css';

const { Content } = Layout;
const { Text, Title } = Typography;

function Messaging({ signOut }) {
    const [messages, setMessages] = useState([]); // State to store messages
    const [newMessage, setNewMessage] = useState(''); // State for the new message input
    const [loading, setLoading] = useState(true); // State to track loading status
    const [userId, setUserId] = useState(''); // State to store the user ID
    const [itemId, setItemId] = useState('');
    const [itemDetails, setItemDetails] = useState(null); // State to store item details
    const ws = useRef(null); // Ref to store WebSocket instance
    const messagesEndRef = useRef(null); // Initialize messagesEndRef using useRef
    const [isReconnecting, setIsReconnecting] = useState(false); // Track reconnection status
    const location = useLocation(); // Get the current location

    // Fetch the user ID when the component mounts
    useEffect(() => {
        const getUserAttributes = async () => {
            const attributes = await fetchUserAttributes();
            setUserId(attributes.sub);
        };
        getUserAttributes();

        // Extract the itemid from query string using URLSearchParams
        const queryParams = new URLSearchParams(location.search);
        const itemid = queryParams.get('item');
        setItemId(itemid); // Set the itemid in state
        console.log(`Item ID: ${itemid}`);

        // Fetch the item details from the items API
        const fetchItemDetails = async () => {
            if (itemid) {
                try {
                    const response = await fetch(`${API_URL}${itemid}/`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch item details.');
                    }
                    const data = await response.json();
                    setItemDetails(data);
                } catch (error) {
                    console.error('Failed to fetch item details:', error);
                }

            }
        };

        fetchItemDetails();

    }, [location]);

    const connectWebSocket = async () => {
        try {
            // Check if ws already exists and is in an invalid state before reconnecting
            if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
                return;
            }

            const { username, userId, signInDetails } = await getCurrentUser();
            if (userId) {
                const session = await fetchAuthSession();
                const jwtToken = session.tokens.idToken;

                console.log(`jwtToken: ${jwtToken}`);
                const websocketUrl = `${WEBSOCKET_URL}?token=${jwtToken}`;

                ws.current = new WebSocket(websocketUrl);

                ws.current.onopen = () => {
                    console.log('WebSocket connected');
                    console.log('item id: ' + itemId);
                    ws.current.send(JSON.stringify({ action: 'getmessages', itemid: itemId, renterid: 'calchia' }));
                    setIsReconnecting(false);
                };

                ws.current.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    console.log(data);

                    if (Array.isArray(data.messages)) {
                        setMessages(data.messages);
                        setLoading(false);
                    } else {
                        setMessages((prevMessages) => [...prevMessages, data]);
                    }
                };

                ws.current.onclose = () => {
                    console.log('WebSocket closed. Attempting to reconnect...');
                    setIsReconnecting(true);
                    setTimeout(() => {
                        connectWebSocket(); // Attempt to reconnect after a delay
                    }, 3000); // Reconnect after 3 seconds
                };

                ws.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };

            }
        } catch (error) {
            console.error('Error fetching user:', error.message);
        }
    };

    // Initialize WebSocket connection
    useEffect(() => {
        if (itemId) {
            connectWebSocket();
        }

        return () => {
            if (ws.current) {
                ws.current.close(); // Properly close the WebSocket connection on unmount
            }
        };
    }, [itemId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const sendMessage = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN && newMessage.trim()) {
            ws.current.send(JSON.stringify(
                {
                    action: 'sendmessage',
                    message: newMessage,
                    itemid: itemId,
                    ownerid: 'calvin',
                    renterid: 'calchia',
                    sender: 'calchia'
                }
            ));
            setNewMessage(''); // Clear the input field after sending the message
        } else if (ws.current && ws.current.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket is not open. Cannot send message.');
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    };

    return (
        <Layout className="messaging-layout">
            <Content className="messaging-content">

                {/* Top bar for item thumbnail, owner, and name */}
                {itemDetails && (
                    <div className="item-details-bar">
                        <Avatar
                            src={itemDetails.image ? `${itemDetails.image}` : undefined}
                            shape="square"
                            size={64}
                            icon={<UserOutlined />}
                        />
                        <div className="item-details-info">
                            <Title level={4}>{itemDetails.title}</Title>
                            <Text>Owner: {itemDetails.owner}</Text>
                        </div>
                    </div>
                )}

                <Card className="messages-card">
                    <div className="messages-container">
                        {loading ? (
                            <Text>Loading...</Text>
                        ) : (
                            <ul className="messages-list">
                                {messages.map((msg, index) => (
                                    <li key={index} className={`message-item ${msg.userId === userId ? 'sent' : 'received'}`}>
                                        <Space align="center">
                                            {msg.userId !== userId && <Avatar icon={<UserOutlined />} />}
                                            <Text>{msg.message}</Text>
                                        </Space>
                                    </li>
                                ))}
                                <div ref={messagesEndRef} />
                            </ul>
                        )}
                    </div>
                    <div className="message-input-container">
                        <Input
                            className="message-input"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            suffix={
                                <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} />
                            }
                        />
                    </div>
                </Card>
            </Content>
        </Layout>
    );
}

export default withAuthenticator(Messaging);
