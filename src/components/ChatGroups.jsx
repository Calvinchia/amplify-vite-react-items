import React, { useState, useEffect } from 'react';
import { Tabs, List, Collapse, Typography, Layout, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { API_URL, API_ROOT } from '../constants';
import 'antd/dist/reset.css';
//import '../ChatGroups.css';
import '../Messaging.css';

const { Panel } = Collapse;
const { Text } = Typography;
const { Content } = Layout;

const ChatGroups = () => {
    const [myStuffChats, setMyStuffChats] = useState([]); // Chats for items I own
    const [othersChats, setOthersChats] = useState([]); // Chats where I am the renter
    const [loading, setLoading] = useState(true); // Track loading state
    const [error, setError] = useState(''); // Track error state
    const [activeTab, setActiveTab] = useState('myStuff'); // Track active tab ("myStuff" or "others")
    const navigate = useNavigate();

    useEffect(() => {
        const fetchChatGroups = async () => {
            setLoading(true);
            setError('');

            try {
                const { username, userId } = await getCurrentUser();
                const session = await fetchAuthSession();
                const jwtToken = session.tokens.idToken;

                // Fetch chat groups for "My Stuff" (items I own)
                const responseMyStuff = await fetch(`${API_ROOT}message?ownerid=acalchia`, {
                    headers: { Authorization: `Bearer ${jwtToken}` }
                });

                const dataMyStuff = await responseMyStuff.json();
                setMyStuffChats(dataMyStuff);

                // Fetch chat groups for "Others" (where I am the renter)
                const responseOthers = await fetch(`${API_ROOT}message?renterid=acalchia`, {
                    headers: { Authorization: `Bearer ${jwtToken}` }
                });

                const dataOthers = await responseOthers.json();
                setOthersChats(dataOthers);
            } catch (err) {
                setError('Failed to fetch chat groups.');
                console.error('Error fetching chat groups:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchChatGroups();
    }, []);

    // Navigate to the messaging page
    const goToMessaging = (itemid, renterid) => {
        navigate(`/messaging?item=${itemid}&renter=${renterid}`);
    };

    return (
        <Layout>
            <Content className="chat-groups-content">
                <Tabs
                    defaultActiveKey="myStuff"
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    centered
                    size="large"
                >
                    {/* Tab for My Stuff */}
                    <Tabs.TabPane tab="My Stuff" key="myStuff">
                        {loading ? (
                            <Text>Loading...</Text>
                        ) : error ? (
                            <Text type="danger">{error}</Text>
                        ) : (
                            <Collapse accordion>
                                {myStuffChats.map(item => (
                                    <Panel header={item.title} key={item.itemid}>
                                        <List
                                            itemLayout="horizontal"
                                            dataSource={item.chatGroups}
                                            renderItem={chatGroup => (
                                                <List.Item
                                                    onClick={() => goToMessaging(item.itemid, chatGroup.renterid)}
                                                    className="chat-group-item"
                                                >
                                                    <List.Item.Meta
                                                        title={`Renter: ${chatGroup.renterid}`}
                                                        description={`Chat Group: ${item.itemid}#${chatGroup.renterid}`}
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    </Panel>
                                ))}
                            </Collapse>
                        )}
                    </Tabs.TabPane>

                    {/* Tab for Others */}
                    <Tabs.TabPane tab="Others" key="others">
                        {loading ? (
                            <Text>Loading...</Text>
                        ) : error ? (
                            <Text type="danger">{error}</Text>
                        ) : (
                            <List
                                itemLayout="horizontal"
                                dataSource={othersChats}
                                renderItem={chatGroup => (
                                    <List.Item
                                        onClick={() => goToMessaging(chatGroup.itemid, chatGroup.renterid)}
                                        className="chat-group-item"
                                    >
                                        <List.Item.Meta
                                            title={`Item: ${chatGroup.itemid}`}
                                            description={`Owner: ${chatGroup.ownerid}`}
                                        />
                                    </List.Item>
                                )}
                            />
                        )}
                    </Tabs.TabPane>
                </Tabs>
            </Content>
        </Layout>
    );
};

export default ChatGroups;
