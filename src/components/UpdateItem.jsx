import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Form, Input, Button, Alert, Spin, Row, Col, Select } from 'antd';

const { Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;

const UpdateItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  
  const [item, setItem] = useState({
    owner: '',
    title: '',
    description: '',
    category: '',
    condition: 'excellent',
    availability: 'available',
    price_per_day: '',
    deposit: '',
    image: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://mlkou5mk3a.execute-api.ap-southeast-1.amazonaws.com/dev/items/${id}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setItem(data);
        form.setFieldsValue(data);
      } catch (error) {
        setError('Failed to fetch item details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id, form]);

  const handleSubmit = async (values) => {
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`https://mlkou5mk3a.execute-api.ap-southeast-1.amazonaws.com/dev/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setSuccessMessage('Item updated successfully!');
      navigate('/');
    } catch (error) {
      setError('Failed to update item. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }
    setError('');
    setSuccessMessage('');
    try {
      const response = await fetch(`https://mlkou5mk3a.execute-api.ap-southeast-1.amazonaws.com/dev/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setSuccessMessage('Item deleted successfully!');
      navigate('/');
    } catch (error) {
      setError('Failed to delete item. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout>
      <Content style={{ padding: '20px' }}>
        <h2>Update Item</h2>
        {error && <Alert message={error} type="error" showIcon />}
        {successMessage && <Alert message={successMessage} type="success" showIcon />}
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={item}
        >
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item label="Owner" name="owner" rules={[{ required: true, message: 'Please input the owner!' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Please input the title!' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item label="Description" name="description" rules={[{ required: true, message: 'Please input the description!' }]}>
                <TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item label="Category" name="category" rules={[{ required: true, message: 'Please input the category!' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item label="Condition" name="condition" rules={[{ required: true, message: 'Please select a condition!' }]}>
                <Select>
                  <Option value="excellent">Excellent</Option>
                  <Option value="good">Good</Option>
                  <Option value="fair">Fair</Option>
                  <Option value="poor">Poor</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item label="Availability" name="availability" rules={[{ required: true, message: 'Please select availability!' }]}>
                <Select>
                  <Option value="available">Available</Option>
                  <Option value="active_rental">Active Rental</Option>
                  <Option value="pending_purchase">Pending Purchase</Option>
                  <Option value="sold">Sold</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item label="Price Per Day" name="price_per_day" rules={[{ required: true, message: 'Please input the price per day!' }]}>
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item label="Deposit" name="deposit" rules={[{ required: true, message: 'Please input the deposit!' }]}>
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Form.Item label="Image URL" name="image">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="me-2">
              Update Item
            </Button>
            <Button type="danger" onClick={handleDelete}>
              Delete Item
            </Button>
          </Form.Item>
        </Form>
      </Content>
    </Layout>
  );
};

export default UpdateItem;
