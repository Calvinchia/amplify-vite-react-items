import React, { useEffect, useState, useRef } from 'react';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Spin, Input, Button, Card, Layout, Typography, Space, Avatar } from 'antd';
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
    const [isReconnecting, setIsReconnecting] = useState(false); // Add state to manage reconnecting
    const ws = useRef(null);
    const messagesEndRef = useRef(null);
    const location = useLocation();

    useEffect(() => {
        const initializeUserAndItem = async () => {
            try {
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

    const goBackToChatGroups = () => {
        navigate('/inbox');
    };

    useEffect(() => {
        const connectWebSocket = async () => {
            try {
                if (!itemId || !renterId || !username) return;

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

    // Helper function to format the time
    const formatTime = (timestamp) => {
        return moment.utc(timestamp).local().format('HH:mm'); // Show only time in 24-hour format
    };

    // Show the date above the first message of each day
    const shouldShowDate = (currentMessage, previousMessage) => {
        if (!previousMessage) {
            return true;
        }
        return !moment.utc(currentMessage.MessageTimestamp).isSame(previousMessage.MessageTimestamp, 'day');
    };

    return (
        <Layout className="messaging-layout">
            <Content className="messaging-content">
                {itemDetails && (
                    <div className="item-details-bar">
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
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <Spin size="large" />
                            </div>
                        ) : (
                            <ul className="messages-list">
                                {messages.map((msg, index) => {
                                    const previousMessage = index > 0 ? messages[index - 1] : null;
                                    return (
                                        <React.Fragment key={index}>
                                            {shouldShowDate(msg, previousMessage) && (
                                                <div className="message-date">
                                                    <Text className="date-label">
                                                        {moment.utc(msg.MessageTimestamp).local().format('D/M/YYYY')}
                                                    </Text>
                                                </div>
                                            )}
                                            <li className={`message-item ${msg.sender === username ? 'sent' : 'received'}`}>
                                                <Space align="start" direction="vertical">
                                                    <Text strong>{msg.sender}</Text>
                                                    <Text>{msg.message}</Text>
                                                    <Text type="secondary">{formatTime(msg.MessageTimestamp)}</Text>
                                                </Space>
                                            </li>
                                        </React.Fragment>
                                    );
                                })}
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
