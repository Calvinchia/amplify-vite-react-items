import React, { useState, useEffect } from 'react';
import { Tabs, List, Collapse, Typography, Layout, Avatar } from 'antd';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { API_MSG, API_URL } from '../constants';
import 'antd/dist/reset.css';
import '../Messaging.css';

const { Panel } = Collapse;
const { Text } = Typography;
const { Content } = Layout;

const ChatGroups = () => {
    const [myStuffChats, setMyStuffChats] = useState({}); // Chat groups for items I own
    const [othersChats, setOthersChats] = useState([]); // Chat groups where I am the renter
    const [itemsData, setItemsData] = useState({}); // Store item details like title and image
    const [loading, setLoading] = useState(true); // Track loading state
    const [error, setError] = useState(''); // Track error state
    const [activeTab, setActiveTab] = useState('myStuff'); // Track active tab ("myStuff" or "others")
    const [username, setUsername] = useState(''); // Track username
    const navigate = useNavigate();

    useEffect(() => {
        const fetchChatGroups = async () => {
            setLoading(true);
            setError('');

            try {
                const { username, userId } = await getCurrentUser();
                setUsername(username); // Set username in state
                const session = await fetchAuthSession();
                const jwtToken = session.tokens.idToken;

                // Fetch chat groups for "My Stuff" (items I own)
                const responseMyStuff = await fetch(`${API_MSG}?ownerid=${username}`, {
                    //headers: { Authorization: `Bearer ${jwtToken}` }
                });
                const dataMyStuff = await responseMyStuff.json();
                setMyStuffChats(dataMyStuff.chatGroups || {}); // Ensure chatGroups is an object

                // Fetch chat groups for "Others" (where I am the renter)
                const responseOthers = await fetch(`${API_MSG}?renterid=${username}`, {
                    //headers: { Authorization: `Bearer ${jwtToken}` }
                });
                const dataOthers = await responseOthers.json();
                console.log(dataOthers);
                setOthersChats(dataOthers.chatGroups || []);

                // Fetch item details (image and title) for all items in both "My Stuff" and "Others"
                const allItemIds = [
                    ...Object.keys(dataMyStuff.chatGroups || {}),
                    ...dataOthers.chatGroups.map(chatGroup => chatGroup.itemid)
                ];

                // Fetch item details for each itemid
                const itemsDataPromises = allItemIds.map(itemid => fetch(`${API_URL}${itemid}`).then(res => res.json()));
                const itemsDataArray = await Promise.all(itemsDataPromises);
                const itemsDataMap = itemsDataArray.reduce((acc, item) => {
                    acc[item.id] = { title: item.title, imageUrl: item.image };
                    return acc;
                }, {});

                setItemsData(itemsDataMap); // Store item details in state

            } catch (err) {
                setError('Failed to fetch chat groups or item details.');
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
                                    <Panel
                                        // Header will now contain the thumbnail image and item title
                                        header={
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {/* Thumbnail Image */}
                                                <img
                                                    src={itemsData[itemid]?.imageUrl}
                                                    alt="Item thumbnail"
                                                    style={{ width: '40px', height: '40px', marginRight: '10px', objectFit: 'cover' }}
                                                />
                                                {/* Item Title */}
                                                <span>{itemsData[itemid]?.title || itemid}</span>
                                            </div>
                                        }
                                        key={itemid}
                                    >
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
                                        onClick={() => goToMessaging(chatGroup.itemid, username)}
                                        className="chat-group-item"
                                    >
                                        <List.Item.Meta
                                            // Replace Avatar component with img for more control over styling
                                            avatar={
                                                <img
                                                    src={itemsData[chatGroup.itemid]?.imageUrl}
                                                    alt="Item thumbnail"
                                                    style={{ width: '40px', height: '40px', marginRight: '10px', objectFit: 'cover' }}
                                                />
                                            }
                                            title={`${itemsData[chatGroup.itemid]?.title || chatGroup.itemid}`}
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
