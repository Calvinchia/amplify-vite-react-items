import React, { useEffect, useState, useRef } from 'react';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { getCurrentUser } from 'aws-amplify/auth';
import { Spin, Input, Button, Card, Layout, Typography, Space, Avatar } from 'antd';
import { ArrowLeftOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../context/WebSocketContext'; // Import WebSocket context
import { API_ROOT, API_URL, S3_BASE_URL  } from '../constants';
import 'antd/dist/reset.css';
import '../Messaging.css';
import moment from 'moment'; // Import moment for formatting datetime

const { Content } = Layout;
const { Text, Title } = Typography;

function Messaging({ signOut }) {
    const navigate = useNavigate();
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('');
    const [itemId, setItemId] = useState('');
    const [renterId, setRenterId] = useState('');
    const [itemDetails, setItemDetails] = useState(null);
    const messagesEndRef = useRef(null);
    const location = useLocation();
    const [hasFetchedMessages, setHasFetchedMessages] = useState(false); // Track if messages have been fetched

    // Use WebSocket context
    const { sendMessage, messages: wsMessages, connected, resetWebSocketMessages } = useWebSocket(); // Added resetWebSocketMessages to reset wsMessages

    // Store the displayed messages to check for duplicates
    const [displayedMessages, setDisplayedMessages] = useState([]);

    useEffect(() => {
        const initializeUserAndItem = async () => {
            try {
                setDisplayedMessages([]);
                resetWebSocketMessages(); // Clear wsMessages from WebSocket context
                
                const user = await getCurrentUser();
                const queryParams = new URLSearchParams(location.search);
                const itemid = queryParams.get('item');
                const renterid = queryParams.get('renter') || user.username;

                setUsername(user.username);
                setItemId(itemid);
                setRenterId(renterid);

                // Clear both displayed messages and WebSocket messages when a new chat group is loaded
                

                if (itemid) {
                    const response = await fetch(`${API_URL}${itemid}/`);
                    if (!response.ok) {
                        throw new Error('Failed to fetch item details.');
                    }
                    const data = await response.json();
                    setItemDetails(data);

                    // Redirect if the owner is viewing without a renter
                    if (data.owner === user.username && !renterid) {
                        navigate('/inbox');
                    }
                }
            } catch (error) {
                console.error('Error during initialization:', error);
                window.location.assign('https://irentstuff.app');
            }
        };

        initializeUserAndItem();
    }, [location, navigate]);

    // Ensure the WebSocket fetches all messages when connected (only once)
    useEffect(() => {
        if (connected && itemId && renterId && !hasFetchedMessages) {
            console.log('WebSocket connected, fetching messages...');
            sendMessage({
                action: 'getmessages',
                itemid: itemId,
                renterid: renterId
            });
            setHasFetchedMessages(true);  // Set to true after fetching messages
            //clear the messages
            console.log('clearing messages');
            setDisplayedMessages([]);
            resetWebSocketMessages(); // Clear wsMessages from WebSocket context
        }
    }, [connected, itemId, renterId, sendMessage, hasFetchedMessages]);

    // Update the messages and check for duplicates
    useEffect(() => {
        
        if (wsMessages && wsMessages.length > 0) {
            console.log('Received messages:', wsMessages);
            console.log('Existing messages:', displayedMessages);
            
            // Check if wsMessages contains a `messages` array or just a single message
            const newMessages = wsMessages.flatMap((wsMsg) => wsMsg.messages || [wsMsg]); // Process array or singular message
    
            const nonDuplicateMessages = newMessages.filter((msg) => {
                // Check for duplicate messages
                return !displayedMessages.some(
                    (existingMsg) =>
                        existingMsg.MessageTimestamp === msg.MessageTimestamp &&
                        existingMsg.message === msg.message
                );
            });
    
            if (nonDuplicateMessages.length > 0) {
                // Combine new and existing messages, then sort them by timestamp (newest to oldest)
                const sortedMessages = [...displayedMessages, ...nonDuplicateMessages].sort(
                    (a, b) => moment.utc(a.MessageTimestamp).valueOf() - moment.utc(b.MessageTimestamp).valueOf()
                );
    
                setDisplayedMessages(sortedMessages);
            }
    
            setLoading(false);
        }
    }, [wsMessages, displayedMessages]);
    

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [displayedMessages]);

    const handleSendMessage = () => {
        if (newMessage.trim()) {
            const messageData = {
                action: 'sendmessage',
                message: newMessage,
                itemid: itemId,
                ownerid: itemDetails?.owner,
                renterid: renterId,
                sender: username,
                timestamp: new Date().toISOString(),
            };

            sendMessage(messageData); // Use WebSocket context's sendMessage
            setNewMessage('');
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            handleSendMessage();
        }
    };

    const formatTime = (timestamp) => {
        return moment.utc(timestamp).local().format('HH:mm');
    };

    const shouldShowDate = (currentMessage, previousMessage) => {
        if (!previousMessage) return true; // Always show date for the first message

        const currentDate = moment.utc(currentMessage.MessageTimestamp).local();
        const previousDate = moment.utc(previousMessage.MessageTimestamp).local();
    
        // Use isSame on the moment objects, not the formatted string
        return !currentDate.isSame(previousDate, 'day');

    };

    const goBackToChatGroups = () => {
        navigate('/');
    };

    const handleGoToDetails = (itemid, admin, ownerid, username) => {

        
        if (admin=="offer") {
            if (ownerid == username) {
                window.location.assign('https://irentstuff.app/#/OffersMade');
            } else {
                window.location.assign('https://irentstuff.app/#/OffersReceived');

            }

        } else {
            if (ownerid == username) {
                window.location.assign(`https://irentstuff.app/#/ViewItem/${itemid}`);
            } else {
                window.location.assign(`https://irentstuff.app/#/ViewItem/${itemid}`);
                
            }

        }


       
        //navigate(`/details/${itemid}`); // Navigate to /details/itemid
        
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
                            src={itemDetails.image.includes(API_ROOT) ? `${API_ROOT}/imageload?itemid=${itemDetails.id}` :itemDetails.image.includes(S3_BASE_URL)? `${itemDetails.image}`: "https://irsimages.s3.ap-southeast-1.amazonaws.com/picture-submissions/no-img.jpg"}

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
                                {displayedMessages.map((msg, index) => {
                                    const previousMessage = index > 0 ? displayedMessages[index - 1] : null;
                                    return (
                                        <React.Fragment key={msg.MessageTimestamp || index}>
                                            {shouldShowDate(msg, previousMessage) && (
                                                <div className="message-date">
                                                    <Text className="date-label">
                                                        {moment.utc(msg.MessageTimestamp).local().format('D/M/YYYY')}
                                                    </Text>
                                                </div>
                                            )}
                                            {msg.admin==="offer" ? (
                                                <li className="message-item admin" onClick={() => handleGoToDetails(itemId, msg.admin, msg.ownerid, username)}>
                                                    <Space align="start" direction="vertical">
                                                        <Text strong>An offer was made (Click to view)</Text>
                                                    </Space>
                                                </li>
                                            ) : msg.admin==="accept" ? (
                                                <li className="message-item admin" onClick={() => handleGoToDetails((itemId, msg.admin, msg.ownerid, username))}>
                                                    <Space align="start" direction="vertical">
                                                        <Text strong>An offer was accepted (Click to view)</Text>
                                                    </Space>
                                                </li>
                                            ) : (
                                                <li className={`message-item ${msg.sender === username ? 'sent' : 'received'}`}>
                                                    <Space align="start" direction="vertical">
                                                        {msg.sender !== username ? <Text strong>{msg.sender}</Text> : ''}
                                                        <Text>{msg.message}</Text>
                                                        <Text type="secondary">{formatTime(msg.MessageTimestamp)}</Text>
                                                    </Space>
                                                </li>
                                            )}
                                            
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
                                <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage} />
                            }
                        />
                    </div>
                </Card>
            </Content>
        </Layout>
    );
}

export default withAuthenticator(Messaging);
