import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout, Row, Col, Card, Alert, Spin } from 'antd';
import { Link } from 'react-router-dom';
import { StorageImage } from '@aws-amplify/ui-react-storage';
import '@aws-amplify/ui-react/styles.css';
import '../App.css';  // Import the CSS file for styling
import { API_URL } from '../constants';

const Home = () => {

  const { Content } = Layout;
  
  const [items, setItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef();

  const truncateText = (text, maxLength) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const pagelimit = 8;

      const response = await fetch(
        `${API_URL}?limit=${pagelimit}&offset=${(currentPage - 1) * pagelimit}`
      );
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
  }, [currentPage]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems, currentPage]);

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

  // Base URL for your S3 bucket
  const S3_BASE_URL = 'https://irsimages.s3.ap-southeast-1.amazonaws.com/picture-submissions/';

  return (
    <Layout>
      <Content style={{ padding: '20px' }}>
        {error && <Alert message={error} type="error" showIcon />}
        
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          {items.map((item, index) => (
            <Col key={item.id} xs={24} sm={12} md={8} lg={6} className="card-column">
              <Link to={`/update/${item.id}`} style={{ textDecoration: 'none' }}>
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
