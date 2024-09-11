import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Form, Input, Button, Alert, Spin, Select, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { uploadData } from 'aws-amplify/storage';  // Import `uploadData` from Amplify Storage
import { v4 as uuidv4 } from 'uuid';  // Import uuid for generating unique IDs
import { API_URL, S3_BASE_URL } from '../constants';

const { Content } = Layout;
const { Option } = Select;

const CreateItem = () => {
  const { user } = useAuthenticator((context) => [context.user]); // Get user info
  const navigate = useNavigate(); // For redirecting
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);  // Store selected image file
  const [categories, setCategories] = useState([]); // Store categories

  // Fetch categories from API when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_URL}cat`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error.message);
      }
    };

    fetchCategories();
  }, []);

  // Redirect to home if the user is not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/'); // Redirect to the home page
    }
  }, [user, navigate]);

  const handleSubmit = async (values) => {
    setError('');
    setLoading(true);

    try {
      // Upload the image to S3
      let imageUrl = '';
      if (imageFile) {
        const fileExtension = imageFile.name.split('.').pop();
        const uniqueFileName = `${Date.now()}-${uuidv4()}.${fileExtension}`;

        const result = await uploadData({
          path: `picture-submissions/${uniqueFileName}`,  // Use the unique filename
          data: imageFile,
          options: {
            contentType: imageFile.type,  // Preserve content type
            acl: 'public-read',
          },
        });

        imageUrl = `${S3_BASE_URL}${uniqueFileName}`;  // Set the uploaded image URL
      }

      const session = await fetchAuthSession();
      const jwtToken = session.tokens.idToken; // Get the JWT token

      const response = await fetch(`${API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwtToken}`,  // Pass the JWT token here
        },
        body: JSON.stringify({
          ...values,
          owner: user.username, // Use the authenticated user's username
          image: imageUrl,  // Use the uploaded S3 URL
          created_date: new Date().toISOString(), // Set current date and time
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const createdItem = await response.json(); // Assuming the response contains the newly created item
      console.log(createdItem);
      setLoading(false);

      // Redirect to the item details page
      navigate(`/`);
    } catch (error) {
      setError('Failed to create item. Please try again.');
      console.error('Error creating item:', error.message);
      setLoading(false);
    }
  };

  // Handle the image selection
  const handleImageChange = ({ file }) => {
    setImageFile(file);
  };

  // Return null while redirecting
  if (!user) {
    return null;
  }

  return (
    <Layout>
      <Content style={{ padding: '50px', width: '100%', margin: 'auto' }}>
        <h2>Create New Item</h2>
        {error && <Alert message={error} type="error" showIcon />}
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          initialValues={{ condition: 'excellent', availability: 'available' }}
          style={{ width: '100%' }} // Ensure form takes full width
        >
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Please input the title!' }]}
            style={{ width: '100%' }}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please input the description!' }]}
            style={{ width: '100%' }}
          >
            <Input.TextArea />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            rules={[{ required: true, message: 'Please select a category!' }]}
            style={{ width: '100%' }}
          >
            <Select>
              {categories.map((category) => (
                <Option key={category.id} value={category.id}>
                  {category.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Condition"
            name="condition"
            rules={[{ required: true, message: 'Please select a condition!' }]}
            style={{ width: '100%' }}
          >
            <Select>
              <Option value="excellent">Excellent</Option>
              <Option value="good">Good</Option>
              <Option value="fair">Fair</Option>
              <Option value="poor">Poor</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Availability"
            name="availability"
            rules={[{ required: true, message: 'Please select availability!' }]}
            style={{ width: '100%' }}
          >
            <Select>
              <Option value="available">Available</Option>
              <Option value="active_rental">Active Rental</Option>
              <Option value="pending_purchase">Pending Purchase</Option>
              <Option value="sold">Sold</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Price Per Day"
            name="price_per_day"
            rules={[{ required: true, message: 'Please input the price per day!' }]}
            style={{ width: '100%' }}
          >
            <Input type="number" />
          </Form.Item>

          <Form.Item
            label="Deposit"
            name="deposit"
            rules={[{ required: true, message: 'Please input the deposit!' }]}
            style={{ width: '100%' }}
          >
            <Input type="number" />
          </Form.Item>

          {/* Image uploader */}
          <Form.Item label="Upload Image" required>
            <Upload
              beforeUpload={() => false}  // Prevent automatic upload
              onChange={handleImageChange}
              listType="picture"
              accept="image/*" 
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Click to Upload</Button>
            </Upload>
          </Form.Item>

          <Form.Item style={{ width: '100%' }}>
            <Button
              type="primary"
              htmlType="submit"
              disabled={loading}  // Only enable button if not loading
              block
            >
              {loading ? <Spin size="small" /> : 'Create Item'}
            </Button>
          </Form.Item>
        </Form>
      </Content>
    </Layout>
  );
};

export default CreateItem;