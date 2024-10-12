import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Spin, Tabs, List, Collapse, Typography, Layout, Badge } from 'antd';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { API_MSG, API_URL, API_ROOT, S3_BASE_URL  } from '../constants';
import { useWebSocket } from '../context/WebSocketContext'; // Use WebSocket context
import moment from 'moment'; // Import moment for date formatting
import 'antd/dist/reset.css';
import '../Messaging.css';

const { Panel } = Collapse;
const { Text } = Typography;
const { Content } = Layout;

const ChatGroups = () => {
    const [myStuffChats, setMyStuffChats] = useState([]); // Chat groups for items I own
    const [othersChats, setOthersChats] = useState([]); // Chat groups where I am the renter
    const [itemsData, setItemsData] = useState({}); // Store item details like title and image
    const [loading, setLoading] = useState(true); // Track loading state
    const [error, setError] = useState(''); // Track error state
    const [newMessages, setNewMessages] = useState({}); // Store new message flags
    const [activeTab, setActiveTab] = useState('myStuff'); // Track active tab ("myStuff" or "others")
    const [username, setUsername] = useState(''); // Track username
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // Use WebSocket context to get messages
    const { messages } = useWebSocket();

    useEffect(() => {
        const itemId = searchParams.get('item');
        const renterId = searchParams.get('renter');

        // If itemid and renterid exist in the query params, navigate to the chat component
        if (itemId && renterId) {
            navigate(`/chat?item=${itemId}&renter=${renterId}`);
            const queryParams = location.search; // This gives you the current query string
            // Change the URL to the root ("/") but keep the query string
            window.history.replaceState({}, '', `/messaging/${queryParams}`);
        }
    }, [searchParams, navigate]);

    useEffect(() => {
        const fetchChatGroups = async () => {
            setLoading(true);
            setError('');
            console.log("fetchChatGroups");

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

                // Sort the chat groups based on `latest_datetime`
                const sortedMyStuffChats = Object.keys(dataMyStuff.chatGroups || {}).map((itemid) => {
                    const chatGroups = dataMyStuff.chatGroups[itemid];

                    // Sort the chat groups within each item by their `latest_datetime`
                    const sortedChatGroups = chatGroups.sort((a, b) =>
                        moment(b.latest_datetime).valueOf() - moment(a.latest_datetime).valueOf()
                    );

                    return {
                        itemid,
                        chatGroups: sortedChatGroups,
                        latest_datetime: sortedChatGroups[0]?.latest_datetime || '', // Use the first group's datetime
                    };
                }).sort((a, b) => moment(b.latest_datetime).valueOf() - moment(a.latest_datetime).valueOf()); // Sort by latest datetime

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
                window.location.assign('https://irentstuff.app');
            } finally {
                setLoading(false);
            }
        };

        fetchChatGroups();
    }, []);

    // Handle new messages from WebSocket
    useEffect(() => {
        if (messages.length > 0) {
            messages.forEach((msg) => {
                if (msg) {
                    const { itemid, renterid, ownerid } = msg;

                    // Check if the ownerid matches the current user's username
                    if (ownerid === username) {
                        // My stuff: if I own the item
                        handleMyStuffChats(msg);
                    } else {
                        // Others: if I am the renter
                        handleOthersChats(msg);
                    }
                }
            });
        }
    }, [messages]);

    // Function to handle "My Stuff" chats (items I own)
    const handleMyStuffChats = (msg) => {

        const chatGroupIndex = myStuffChats.findIndex(group => group.itemid === msg.itemid);

        //create msg for insert
        const newMsg = {
            renterid: msg.renterid,
            latest_datetime: msg.MessageTimestamp
        }

        if (chatGroupIndex !== -1) {
            // Update the existing chat group

            //check if renterid exists in this itemid group, if exist update latest_datetime else add new group
            const renterIndex = myStuffChats[chatGroupIndex].chatGroups.findIndex(group => group.renterid === newMsg.renterid);
            let updatedMyStuffChats;
            if(renterIndex !== -1){
                // Update the existing chat group
                updatedMyStuffChats = [...myStuffChats];
                updatedMyStuffChats[chatGroupIndex].chatGroups[renterIndex].latest_datetime = newMsg.latest_datetime;
                updatedMyStuffChats[chatGroupIndex].latest_datetime = newMsg.latest_datetime;
                
            } else {
                // Create a new chat group if it doesn't exist
                console.log("Create a new chat group if it doesn't exist");

                updatedMyStuffChats = [...myStuffChats];
                updatedMyStuffChats[chatGroupIndex].chatGroups.push(newMsg);
                updatedMyStuffChats[chatGroupIndex].latest_datetime = newMsg.latest_datetime;
                

            }
            if (username && msg.sender) {
                if (msg.sender !== username) {
                    // Mark as new message from renter
                    setNewMessages((prev) => ({
                        ...prev,
                        [`${msg.itemid}#${newMsg.renterid}`]: true,
                        [msg.itemid]: true,
                    }));
                }
            }

            // Re-sort the chat groups by latest message time
            const sortedChats = updatedMyStuffChats.sort(
                (a, b) => moment(b.latest_datetime).valueOf() - moment(a.latest_datetime).valueOf()
            );
            setMyStuffChats(sortedChats);


        } else {
            // Create a new chat group if it doesn't exist
            const newChatGroup = {
                itemid: msg.itemid,
                chatGroups: [newMsg],
                latest_datetime: newMsg.latest_datetime, // Use the first group's datetime
            };
            setMyStuffChats((prev) => [newChatGroup, ...prev]);

            //if username and msg.sender are not blank
            if (username && msg.sender) {
                if (msg.sender !== username) {
                    // Mark as new message from renter
                    setNewMessages((prev) => ({
                        ...prev,
                        [`${msg.itemid}#${newMsg.renterid}`]: true,
                        [msg.itemid]: true,
                    }));
                }
            }
        }
    };

    // Function to handle "Others" chats (items I rent)
    const handleOthersChats = (msg) => {
        console.log("msg",msg);
        console.log("othersChats",othersChats);
        const chatGroupIndex = othersChats.findIndex(group => group.itemid === msg.itemid && group.ownerid === msg.ownerid);
        console.log("chatGroupIndex",chatGroupIndex);
        if (chatGroupIndex !== -1) {
            // Update the existing chat group
            console.log("chatGroupIndex found",chatGroupIndex);
            let updatedOthersChats = [...othersChats];
            console.log("updatedOthersChats",updatedOthersChats);
            updatedOthersChats[chatGroupIndex].latest_datetime = msg.MessageTimestamp;
            console.log("updatedOthersChats_after",updatedOthersChats);
            if (username && msg.sender) {
                if (msg.sender !== username) {
                    
                    console.log("msg.sender",msg.sender);
                    console.log("username",username);
                    console.log("Mark as new message from renter");
                    console.log(`${msg.itemid}#${msg.ownerid}`);
                    // Mark as new message
                    setNewMessages((prev) => ({
                        ...prev,
                        [`${msg.itemid}#${msg.ownerid}`]: true,
                    }));
                }
            }

            // Re-sort the chat groups by latest message time
            const sortedChats = updatedOthersChats.sort(
                (a, b) => moment(b.latest_datetime).valueOf() - moment(a.latest_datetime).valueOf()
            );
            setOthersChats(sortedChats);
        } else {
            // Create a new chat group if it doesn't exist
            const newChatGroup = {
                itemid: msg.itemid,
                ownerid: msg.ownerid,
                latest_datetime: msg.MessageTimestamp,
            };
            setOthersChats((prev) => [newChatGroup, ...prev]);

            if (username && msg.sender) {
                if (msg.sender !== username) {
                    console.log("msg.sender",msg.sender);
                    console.log("username",username);
                    console.log("Mark as new message from renter2");
                    console.log(`${msg.itemid}#${msg.ownerid}`);
                    setNewMessages((prev) => ({
                        ...prev,
                        [`${msg.itemid}#${msg.ownerid}`]: true,
                    }));
                }
            }
        }
    };

    // Refactor the panel items creation for "My Stuff"
const getMyStuffCollapseItems = (myStuffChats, itemsData, newMessages, goToMessaging) => {
    return myStuffChats.map(({ itemid, chatGroups, latest_datetime }) => ({
      key: itemid,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={itemsData[itemid]?.imageUrl.includes(API_ROOT) ? `${API_ROOT}/imageload?itemid=${itemid}` :itemsData[itemid]?.imageUrl.includes(S3_BASE_URL)? `${itemsData[itemid]?.imageUrl}`: "https://irsimages.s3.ap-southeast-1.amazonaws.com/picture-submissions/no-img.jpg"}

              alt="Item thumbnail"
              style={{ width: '40px', height: '40px', marginRight: '10px', objectFit: 'cover' }}
            />
            <span>{itemsData[itemid]?.title || itemid}</span>
          </div>
          <Text type="secondary">{formatDate(latest_datetime)}</Text>
          {newMessages[itemid] && (
            <Badge count="N" style={{ backgroundColor: '#52c41a' }} />
        )}
        </div>
      ),
      children: (
        <List
          itemLayout="horizontal"
          dataSource={chatGroups}
          renderItem={(chatGroup) => (
            <List.Item onClick={() => goToMessaging(itemid, chatGroup.renterid)}>
              <List.Item.Meta title={chatGroup.renterid} />
              <Text type="secondary">{formatDate(chatGroup.latest_datetime)}</Text>
              {newMessages[`${itemid}#${chatGroup.renterid}`] && (
                <Badge count="N" style={{ backgroundColor: '#52c41a' }} />
            )}
            </List.Item>
          )}
        />
      ),
    }));
  };

    // Function to format the date based on whether it's today or not
    const formatDate = (datetime) => {
        const date = moment.utc(datetime).local(); // Convert UTC to local time
        if (date.isSame(moment(), 'day')) {
            return date.format('h:mm a'); // Show time if today
        }
        return date.format('D/M/YYYY'); // Show date if not today
    };

    // Navigate to the messaging page
    const goToMessaging = (itemid, renterid) => {
        navigate(`/chat?item=${itemid}&renter=${renterid}`);
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
              <Collapse accordion items={getMyStuffCollapseItems(myStuffChats, itemsData, newMessages, goToMessaging)} />
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
                          src={itemsData[chatGroup.itemid]?.imageUrl.includes(API_ROOT) ? `${API_ROOT}/imageload?itemid=${itemid}` :itemsData[chatGroup.itemid]?.imageUrl.includes(S3_BASE_URL)? `${itemsData[chatGroup.itemid]?.imageUrl}`: "https://irsimages.s3.ap-southeast-1.amazonaws.com/picture-submissions/no-img.jpg"}

                          alt="Item thumbnail"
                          style={{ width: '40px', height: '40px', marginRight: '10px', marginLeft: '40px', objectFit: 'cover' }}
                        />
                      }
                      title={`${itemsData[chatGroup.itemid]?.title || chatGroup.itemid}`}
                      description={`Owner: ${chatGroup.ownerid}`}
                    />
                    <Text type="secondary">{formatDate(chatGroup.latest_datetime)}</Text>
                    {newMessages[`${chatGroup.itemid}#${chatGroup.ownerid}`] && <Badge count="N" style={{ backgroundColor: '#52c41a' }} />}
                  </List.Item>
                )}
              />
            ),
          },
    ];

    return (
        <Layout>
          <Content className="chat-groups-content">
            <Tabs defaultActiveKey="myStuff" activeKey={activeTab} onChange={setActiveTab} items={tabItems} centered size="large" />
          </Content>
        </Layout>
      );
};

export default ChatGroups;