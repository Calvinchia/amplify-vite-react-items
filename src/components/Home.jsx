import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout, Row, Col, Card, Alert, Spin } from 'antd';
import { useLocation, Link } from 'react-router-dom';
import { StorageImage } from '@aws-amplify/ui-react-storage';
import '@aws-amplify/ui-react/styles.css';
import '../App.css';  // Import the CSS file for styling
import { API_URL, S3_BASE_URL } from '../constants';
import { useAuthenticator, Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getCurrentUser } from 'aws-amplify/auth';

const { Content } = Layout;

const Home = ({ ownerType }) => {
  
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);
  const location = useLocation();
  const successMessage = location.state?.successMessage;

  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef();

  useEffect(() => {
    if (successMessage) {
      // Display the message (you can use a state or directly show it)
      console.log(successMessage);
    }
  }, [successMessage]);


  const truncateText = (text, maxLength) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  const fetchItems = useCallback(async () => {

    const sessionheader = {
      'Content-Type': 'application/json'
    };

    try {
    const { username, userId, signInDetails } = await getCurrentUser();
    if (userId) {
      const session = await fetchAuthSession();
      const jwtToken = session.tokens.idToken;

      sessionheader.Authorization = `Bearer ${jwtToken}`;

    }
    } catch (error) {
      //console.error('Error fetching user:', error.message)
    }

    setLoading(true);
    setError('');
    try {
      const pagelimit = 8;

      
     


      const response = await fetch(
        `${API_URL}?limit=${pagelimit}&offset=${(currentPage - 1) * pagelimit}&owner=${ownerType}`, {
        method: 'GET',
        headers: sessionheader,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setItems((prevItems) => {
        // Filter out items that already exist in prevItems
        const newItems = data.results.filter(
          newItem => !prevItems.some(prevItem => prevItem.id === newItem.id)
        );

        // Append only the new items to the existing list
        return [...prevItems, ...newItems];
      });
      setHasMore(data.results.length > 0);
    } catch (error) {
      setError('Failed to fetch items. Please try again.');
      console.error('Error fetching items:', error.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, ownerType]);

  useEffect(() => {
    
    fetchItems();
  }, [fetchItems, currentPage]);

  // Clear items only once on page load

  // Clear items when location changes
  useEffect(() => {

    setItems([]);
    setCurrentPage(1); // Reset to the first page

    setLoading(true);
    setError('');
    setHasMore(true);

    fetchItems();

  }, [location]);

  const lastItemRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setCurrentPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  return (
    <Layout>
      <Content style={{ padding: '20px' }}>
        {error && <Alert message={error} type="error" showIcon />}

        <div>
          {successMessage && <div className="alert alert-success">{successMessage}</div>}
          {/* The rest of your home page */}
        </div>

        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          {items.map((item, index) => (
            <Col key={item.id} xs={24} sm={12} md={8} lg={6} className="card-column">
              <Link to={`/details/${item.id}`} style={{ textDecoration: 'none' }}>
                <Card
                  hoverable
                  className="equal-height-card"
                  style={{ display: 'flex', flexDirection: 'column', height: '100%' }}  // Make the card flex and full height
                  cover={
                    item.image ? (
                      <img
                        src={`${S3_BASE_URL}${item.image}`}
                        alt={item.title}
                        style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                    ) : null
                  }
                >
                  <div style={{ flexGrow: 1 }}>  {/* Make the card body grow to fill the remaining space */}
                    <Card.Meta
                      title={item.title}
                      description={
                        <>
                          <div><strong>Owner:</strong> {item.owner}</div>
                          <div>{truncateText(item.description, 100)}</div>
                          <div><strong>Price Per Day:</strong> ${item.price_per_day}</div>
                          <div><strong>Condition:</strong> {item.condition}</div>
                        </>
                      }
                    />
                  </div>
                </Card>
                {items.length === index + 1 && <div ref={lastItemRef}></div>}
              </Link>
            </Col>
          ))}
        </Row>

        {loading && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Spin size="large" />
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default Home;