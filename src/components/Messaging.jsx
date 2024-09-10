import React, { useEffect, useState, useRef } from 'react';
import { Amplify } from 'aws-amplify';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { withAuthenticator } from '@aws-amplify/ui-react';
import { Input, Button, Card, Layout, Typography, Space, Avatar } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import 'antd/dist/reset.css'; // Reset default Ant Design styles for better custom styling
import '../Messaging.css'; // Import custom styles

const { Content } = Layout;
const { Text } = Typography;

function Messaging({ signOut }) {
  const [messages, setMessages] = useState([]); // State to store messages
  const [newMessage, setNewMessage] = useState(''); // State for the new message input
  const [loading, setLoading] = useState(true); // State to track loading status
  const [userId, setUserId] = useState(''); // State to store the user ID
  const ws = useRef(null); // Ref to store WebSocket instance
  const messagesEndRef = useRef(null); // Initialize messagesEndRef using useRef

  // Fetch the user ID when the component mounts
  useEffect(() => {
    const getUserAttributes = async () => {
      const attributes = await fetchUserAttributes();
      setUserId(attributes.sub);
    };
    getUserAttributes();
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    ws.current = new WebSocket('wss://6z72j61l2b.execute-api.ap-southeast-1.amazonaws.com/dev/');

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (Array.isArray(data.messages)) {
        setMessages(data.messages); // Initialize with the list of past messages
        setLoading(false); // Set loading to false once messages are loaded
      } else {
        setMessages((prevMessages) => [...prevMessages, data]); // Add new message to the state
      }
    };

    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ action: 'getmessages', itemId: '888' }));
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sendMessage = () => {
    if (ws.current && newMessage.trim()) {
      ws.current.send(JSON.stringify({ action: 'sendmessage', message: newMessage, userId }));
      setNewMessage(''); // Clear the input field after sending the message
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
