import React, { useEffect, useState, useRef } from 'react';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'; // Correct imports for getting current user
import { Input, Button, Card, Layout, Typography, Space, Avatar } from 'antd';
import { ArrowLeftOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { API_URL, WEBSOCKET_URL } from '../constants';
import { useLocation, useNavigate } from 'react-router-dom';
import 'antd/dist/reset.css';
import '../Messaging.css';
import moment from 'moment'; // Import moment for formatting datetime

const { Content } = Layout;
const { Text, Title } = Typography;

function Messaging({ signOut }) {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');
    const [itemId, setItemId] = useState('');
    const [renterId, setRenterId] = useState('');
    const [itemDetails, setItemDetails] = useState(null);
    const ws = useRef(null);
    const messagesEndRef = useRef(null);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const location = useLocation();

    // Fetch the user and item details when the component mounts
    useEffect(() => {
        const initializeUserAndItem = async () => {
            try {
                // Use getCurrentUser to get the current user details
                const user = await getCurrentUser();
                const queryParams = new URLSearchParams(location.search);
                const itemid = queryParams.get('item');
                const renterid = queryParams.get('renter') || user.username;

                setUsername(user.username);
                setItemId(itemid);
                setRenterId(renterid);

                if (itemid) {
                    const response = await fetch(`${API_URL}${itemid}/`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch item details.');
                    }
                    const data = await response.json();
                    setItemDetails(data);

                    if (data.owner === user.username && !renterid) {
                        navigate('/inbox');
                    }
                }
            } catch (error) {
                console.error('Error during initialization:', error);
            }
        };

        initializeUserAndItem();
    }, [location, navigate]);

     // Navigate back to the chat group page
     const goBackToChatGroups = () => {
        navigate('/inbox'); // Replace this path with the actual route to your chat groups page
    };

    // Connect to WebSocket when itemId, renterId, and username are loaded
    useEffect(() => {
        const connectWebSocket = async () => {
            try {
                if (!itemId || !renterId || !username) return;

                // Use fetchAuthSession to get the JWT token
                const session = await fetchAuthSession();
                const jwtToken = session.tokens.idToken;

                const websocketUrl = `${WEBSOCKET_URL}?token=${jwtToken}`;
                ws.current = new WebSocket(websocketUrl);

                ws.current.onopen = () => {
                    console.log('WebSocket connected');
                    ws.current.send(JSON.stringify({ action: 'getmessages', itemid: itemId, renterid: renterId }));
                    setIsReconnecting(false);
                };

                ws.current.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    console.log(data);

                    if (Array.isArray(data.messages)) {
                        setMessages(data.messages);
                    } else {
                        setMessages((prevMessages) => [...prevMessages, data]);
                    }
                    setLoading(false);
                };

                ws.current.onclose = () => {
                    console.log('WebSocket closed. Attempting to reconnect...');
                    setIsReconnecting(true);
                    setTimeout(connectWebSocket, 3000);
                };

                ws.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };
            } catch (error) {
                console.error('Error connecting to WebSocket:', error);
            }
        };

        if (itemId && renterId && username) {
            connectWebSocket();
        }

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, [itemId, renterId, username]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const sendMessage = () => {
        if (ws.current && ws.current.readyState === WebSocket.OPEN && newMessage.trim()) {
            ws.current.send(JSON.stringify({
                action: 'sendmessage',
                message: newMessage,
                itemid: itemId,
                ownerid: itemDetails.owner,
                renterid: renterId,
                sender: username,
                timestamp: new Date().toISOString()
            }));
            setNewMessage('');
        } else {
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
                {itemDetails && (
                    <div className="item-details-bar">
                      {/* Back Button */}
                      <Button
                            type="text"
                            icon={<ArrowLeftOutlined />}
                            onClick={goBackToChatGroups}
                            style={{ marginRight: '10px' }}
                        />
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
                                    <li key={index} className={`message-item ${msg.sender === username ? 'sent' : 'received'}`}>
                                        <Space align="start" direction="vertical">
                                            <Text strong>{msg.sender}</Text>
                                            <Text>{msg.message}</Text>
                                            <Text type="secondary">{moment(msg.timestamp).format('MMMM Do YYYY, h:mm:ss a')}</Text>
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
