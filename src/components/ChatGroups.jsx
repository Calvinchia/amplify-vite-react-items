import React, { useState, useEffect } from 'react';
import { Spin, Tabs, List, Collapse, Typography, Layout } from 'antd';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { API_MSG, API_URL } from '../constants';
import moment from 'moment';  // Import moment for date formatting
import 'antd/dist/reset.css';
import '../Messaging.css';

const { Panel } = Collapse;
const { Text } = Typography;
const { Content } = Layout;

const ChatGroups = () => {
    const [myStuffChats, setMyStuffChats] = useState([]); // Chat groups for items I own (updated to array)
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
                const { username } = await getCurrentUser();
                setUsername(username); // Set username in state
                const session = await fetchAuthSession();
                const jwtToken = session.tokens.idToken;

                // Fetch chat groups for "My Stuff" (items I own)
                const responseMyStuff = await fetch(`${API_MSG}?ownerid=${username}`, {
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                const dataMyStuff = await responseMyStuff.json();

                // Ensure that each chat group has its own latest_datetime
                const sortedMyStuffChats = Object.keys(dataMyStuff.chatGroups || {}).map((itemid) => {
                    const chatGroups = dataMyStuff.chatGroups[itemid];

                    // Sort the chat groups within each item by their individual `latest_datetime`
                    const sortedChatGroups = chatGroups.sort((a, b) => 
                        moment(b.latest_datetime).valueOf() - moment(a.latest_datetime).valueOf()
                    );

                    return {
                        itemid,
                        chatGroups: sortedChatGroups,
                        latest_datetime: sortedChatGroups[0]?.latest_datetime || '',  // Use the first group's datetime after sorting
                    };
                }).sort((a, b) => moment(b.latest_datetime).valueOf() - moment(a.latest_datetime).valueOf());  // Sort items by latest datetime

                setMyStuffChats(sortedMyStuffChats);

                // Fetch chat groups for "Others" (where I am the renter)
                const responseOthers = await fetch(`${API_MSG}?renterid=${username}`, {
                    headers: {
                        'Authorization': `Bearer ${jwtToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                const dataOthers = await responseOthers.json();
                console.log(dataOthers);

                // Sort others chat groups by `latest_datetime`
                const sortedOthersChats = dataOthers.chatGroups.sort(
                    (a, b) => moment(b.latest_datetime).valueOf() - moment(a.latest_datetime).valueOf()
                );
                setOthersChats(sortedOthersChats);

                // Fetch item details for each item
                const allItemIds = [
                    ...Object.keys(dataMyStuff.chatGroups || {}),
                    ...dataOthers.chatGroups.map((chatGroup) => chatGroup.itemid),
                ];

                const itemsDataPromises = allItemIds.map((itemid) =>
                    fetch(`${API_URL}${itemid}`).then((res) => res.json())
                );

                const itemsDataArray = await Promise.all(itemsDataPromises);
                const itemsDataMap = itemsDataArray.reduce((acc, item) => {
                    acc[item.id] = { title: item.title, imageUrl: item.image };
                    return acc;
                }, {});

                setItemsData(itemsDataMap);
            } catch (err) {
                setError('Failed to fetch chat groups or item details.');
                console.error('Error fetching chat groups:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchChatGroups();
    }, []);

    // Function to format the date based on whether it's today or not, with UTC to local timezone conversion
    const formatDate = (datetime) => {
        const date = moment.utc(datetime).local(); // Convert UTC to local time
        if (date.isSame(moment(), 'day')) {
            return date.format('h:mm a'); // Show time if today
        }
        return date.format('D/M/YYYY'); // Show date if not today
    };

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
                    <Spin size="large" />
                </div>
            ) : error ? (
                <Text type="danger">{error}</Text>
            ) : (
                <Collapse accordion>
                    {myStuffChats.map(({ itemid, chatGroups, latest_datetime }) => (
                        <Panel
                            header={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <img
                                            src={itemsData[itemid]?.imageUrl}
                                            alt="Item thumbnail"
                                            style={{ width: '40px', height: '40px', marginRight: '10px', objectFit: 'cover' }}
                                        />
                                        <span>{itemsData[itemid]?.title || itemid}</span>
                                    </div>
                                    <Text type="secondary">{formatDate(latest_datetime)}</Text>
                                </div>
                            }
                            key={itemid}
                        >
                            <List
                                itemLayout="horizontal"
                                dataSource={chatGroups}
                                renderItem={(chatGroup) => (
                                    <List.Item onClick={() => goToMessaging(itemid, chatGroup.renterid)}>
                                        <List.Item.Meta
                                            title={chatGroup.renterid}
                                        />
                                        <Text type="secondary">{formatDate(chatGroup.latest_datetime)}</Text>
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
                    <Spin size="large" />
                </div>
            ) : error ? (
                <Text type="danger">{error}</Text>
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={othersChats}
                    renderItem={(chatGroup) => (
                        <List.Item onClick={() => goToMessaging(chatGroup.itemid, username)}>
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
                            <Text type="secondary">{formatDate(chatGroup.latest_datetime)}</Text>
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
                    items={tabItems} 
                    centered
                    size="large"
                />
            </Content>
        </Layout>
    );
};

export default ChatGroups;
