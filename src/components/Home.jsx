import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Layout, Row, Col, Card, Alert, Spin } from 'antd';
import { Link } from 'react-router-dom';
import '../App.css';  // Import the CSS file for styling

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
      const pagelimit = 6;
      const response = await fetch(
        `https://mlkou5mk3a.execute-api.ap-southeast-1.amazonaws.com/dev/items?limit=${pagelimit}&offset=${(currentPage - 1) * pagelimit}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setItems((prevItems) => [...prevItems, ...data.results]);
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

  return (
    <Layout>
      <Content style={{ padding: '20px' }}>
        <h2>Items List</h2>
        {error && <Alert message={error} type="error" showIcon />}
        
        <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
          {items.map((item, index) => (
            <Col key={item.id} xs={24} sm={12} md={8} lg={6} className="card-column">
              <Card hoverable className="equal-height-card">
                <Link to={`/update/${item.id}`} style={{ textDecoration: 'none' }}>
                  <Card.Meta 
                    title={item.title}
                    description={
                      <>
                        <div>Category: {item.category}</div>
                        <div>{truncateText(item.description, 100)}</div>
                        <div><strong>Price Per Day:</strong> ${item.price_per_day}</div>
                        <div><strong>Condition:</strong> {item.condition}</div>
                        <div><strong>Availability:</strong> {item.availability}</div>
                      </>
                    }
                  />
                </Link>
              </Card>
              {items.length === index + 1 && <div ref={lastItemRef}></div>}
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
