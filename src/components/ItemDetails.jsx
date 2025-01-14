import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Button, Alert, Spin, Row, Col } from 'antd';
import { API_URL, S3_BASE_URL, API_ROOT } from '../constants';
import { useAuthenticator, Authenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';

const { Content } = Layout;

const ItemDetail = () => {
    const { user, signOut } = useAuthenticator((context) => [context.user]);
    const { id } = useParams();
    const navigate = useNavigate();

    const [item, setItem] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isOwner, setIsOwner] = useState(false);  // Determine if the user owns the item

    useEffect(() => {
        const fetchItemDetails = async () => {
            setLoading(true);
            try {
                // Fetch item details from the API
                const response = await fetch(`${API_URL}${id}/`);
                if (!response.ok) {
                    throw new Error('Failed to fetch item details.');
                }
                const data = await response.json();
                setItem(data);

                if (user) {
                    // Check if the user is authenticated and is the owner
                    const session = await fetchAuthSession();
                    if (session?.tokens?.idToken) {
                        const currentUsername = session.tokens.idToken.payload["cognito:username"];
                        // Assuming the `owner` field of the item is the username
                        if (data.owner === currentUsername) {
                            setIsOwner(true); // Set isOwner to true if the user is the owner
                        }
                    }
                } else {
                    setIsOwner(false);
                }
            } catch (error) {
                setError('Failed to fetch item details. Please try again.');
                //display error message
                console.log(error);
            } finally {
                setLoading(false);
            }
        };

        const fetchCategories = async () => {
            try {
                const response = await fetch(`${API_URL}cat`);
                if (!response.ok) {
                    throw new Error('Failed to fetch categories.');
                }
                const data = await response.json();
                setCategories(data); // Set the categories from the API response
            } catch (error) {
                setError('Failed to fetch categories. Please try again.');
            }
        };

        fetchItemDetails();
        fetchCategories();
    }, [id]);

    // Get the category name from the ID
    const getCategoryNameById = (categoryId) => {
        const category = categories.find(cat => Number(cat.id) === Number(categoryId));
        return category ? category.name : '';
    };

    const handleEnquire = () => {
        // Navigate to the messaging page with itemid and current user's username
        navigate(`/chat?item=${id}`);
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this item?')) {
            return;
        }
        try {
            const session = await fetchAuthSession();
            const jwtToken = session.tokens.idToken; // Get the JWT token

            const response = await fetch(`${API_URL}${id}/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jwtToken}`,  // Pass the JWT token here
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete item.');
            }

            navigate('/', { state: { successMessage: 'Item deleted successfully!' } });
        } catch (error) {
            setError('Failed to delete item. Please try again.');
        }
    };

    const handleUpdate = () => {
        navigate(`/update/${id}`);
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (error) {
        return <Alert message={error} type="error" showIcon />;
    }

    return (
        <Layout>
            <Content style={{ padding: '20px' }}>
                <h2>{item?.title}</h2>
                <Row gutter={[16, 16]}>
                    <Col span={12}>
                        <img
                            src={item.image.includes(API_ROOT) ? `${API_ROOT}/imageload?itemid=${item.id}` :item.image.includes(S3_BASE_URL)? `${item.image}`: "https://irsimages.s3.ap-southeast-1.amazonaws.com/picture-submissions/no-img.jpg"}

                            alt={item?.title}
                            style={{ width: '100%', height: '300px', objectFit: 'contain', marginBottom: '16px' }}
                        />
                    </Col>
                    <Col span={12}>
                        <p><strong>Description:</strong> {item?.description}</p>
                        <p><strong>Category:</strong> {getCategoryNameById(item.category)}</p> {/* Display the category name */}
                        <p><strong>Condition:</strong> {item?.condition}</p>
                        <p><strong>Availability:</strong> {item?.availability}</p>
                        <p><strong>Price Per Day:</strong> ${item?.price_per_day}</p>
                        <p><strong>Deposit:</strong> ${item?.deposit}</p>
                    </Col>
                </Row>

                {isOwner && (
                    <div style={{ marginTop: '20px' }}>
                        <Button type="primary" onClick={handleUpdate} style={{ marginRight: '10px' }}>
                            Update Item
                        </Button>
                        <Button type="danger" onClick={handleDelete}>
                            Delete Item
                        </Button>
                    </div>
                )}
                {!isOwner && (
                    <div style={{ marginTop: '20px' }}>
                        <Button type="primary" onClick={handleEnquire}>
                            Enquire
                        </Button>
                    </div>
                )}
            </Content>
        </Layout>
    );
};

export default ItemDetail;
