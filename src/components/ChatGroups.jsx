import React, { useState, useEffect } from 'react';
import { Spin, Tabs, List, Collapse, Typography, Layout } from 'antd';
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
                const responseMyStuff = await fetch(`${API_MSG}?ownerid=${username}`);
                const dataMyStuff = await responseMyStuff.json();
                setMyStuffChats(dataMyStuff.chatGroups || {}); // Ensure chatGroups is an object

                // Fetch chat groups for "Others" (where I am the renter)
                const responseOthers = await fetch(`${API_MSG}?renterid=${username}`);
                const dataOthers = await responseOthers.json();
                setOthersChats(dataOthers.chatGroups || []);

                // Fetch item details (image and title) for all items in both "My Stuff" and "Others"
                const allItemIds = [
                    ...Object.keys(dataMyStuff.chatGroups || {}),
                    ...dataOthers.chatGroups.map(chatGroup => chatGroup.itemid),
                ];

                // Fetch item details for each itemid
                const itemsDataPromises = allItemIds.map(itemid =>
                    fetch(`${API_URL}${itemid}`).then(res => res.json())
                );
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

    const tabItems = [
        {
            key: 'myStuff',
            label: 'My Stuff',
            children: loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin size="large" /> {/* Ant Design Spin loader */}
                </div>
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
                                        <List.Item.Meta title={`${chatGroup}`} />
                                    </List.Item>
                                )}
                            />
                        </Panel>
                    ))}
                </Collapse>
            ),
        },
        {
            key: 'others',
            label: 'Others',
            children: loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Spin size="large" /> {/* Ant Design Spin loader */}
                </div>
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
                                avatar={
                                    <img
                                        src={itemsData[chatGroup.itemid]?.imageUrl}
                                        alt="Item thumbnail"
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            marginRight: '10px',
                                            marginLeft: '40px',
                                            objectFit: 'cover',
                                        }}
                                    />
                                }
                                title={`${itemsData[chatGroup.itemid]?.title || chatGroup.itemid}`}
                                description={`Owner: ${chatGroup.ownerid}`}
                            />
                        </List.Item>
                    )}
                />
            ),
        },
    ];

    return (
        <Layout>
            <Content className="chat-groups-content">
                <Tabs
                    defaultActiveKey="myStuff"
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems} // Use the new items array for Tabs
                    centered
                    size="large"
                />
            </Content>
        </Layout>
    );
};

export default ChatGroups;
