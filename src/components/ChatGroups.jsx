import React, { useState, useEffect } from 'react';
import { Tabs, List, Collapse, Typography, Layout } from 'antd';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { API_MSG } from '../constants';
import 'antd/dist/reset.css';
import '../Messaging.css';

const { Panel } = Collapse;
const { Text } = Typography;
const { Content } = Layout;

const ChatGroups = () => {
    const [myStuffChats, setMyStuffChats] = useState({}); // Chat groups for items I own
    const [othersChats, setOthersChats] = useState([]); // Chat groups where I am the renter
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
                const responseMyStuff = await fetch(`${API_MSG}?ownerid=calvin`, {
                    //headers: { Authorization: `Bearer ${jwtToken}` }
                });

                const dataMyStuff = await responseMyStuff.json();
                setMyStuffChats(dataMyStuff.chatGroups || {}); // Ensure chatGroups is an object
                console.log(dataMyStuff);

                // Fetch chat groups for "Others" (where I am the renter)
                const responseOthers = await fetch(`${API_MSG}?renterid=calchia`, {
                    //headers: { Authorization: `Bearer ${jwtToken}` }
                });

                const dataOthers = await responseOthers.json();
                console.log(dataOthers);
                setOthersChats(dataOthers.chatGroups || []);
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
                                {/* Iterate over the keys (itemids) in myStuffChats */}
                                {Object.keys(myStuffChats).map(itemid => (
                                    <Panel header={`Item: ${itemid}`} key={itemid}>
                                        <List
                                            itemLayout="horizontal"
                                            dataSource={myStuffChats[itemid]} // List of renters for each itemid
                                            renderItem={chatGroup => (
                                                <List.Item
                                                    onClick={() => goToMessaging(itemid, chatGroup)}
                                                    className="chat-group-item"
                                                >
                                                    <List.Item.Meta
                                                        title={`${chatGroup}`}
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
