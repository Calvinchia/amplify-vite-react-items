import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Form, Input, Button, Alert, Spin, Row, Col, Select, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { uploadData } from 'aws-amplify/storage';  // Amplify's Storage for uploading images
import { v4 as uuidv4 } from 'uuid';  // Import uuid for generating unique IDs
import { API_URL, S3_BASE_URL, API_ROOT } from '../constants';
import { fetchAuthSession } from 'aws-amplify/auth';

const { Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;

const UpdateItem = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [item, setItem] = useState({
    title: '',
    description: '',
    category: '',
    condition: 'excellent',
    availability: 'available',
    price_per_day: '',
    deposit: '',
    image: ''
  });
  const [originalItem, setOriginalItem] = useState({}); // Store the original item
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [newImageFile, setNewImageFile] = useState(null);  // Track the new image file
  const [fileList, setFileList] = useState([]);  // Track the file upload
  const [categories, setCategories] = useState([]);  // Store the list of categories
  const [selectedCategoryId, setSelectedCategoryId] = useState(''); // Store selected category id

  useEffect(() => {
    // Fetch the list of categories
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

    fetchCategories();
  }, []);

  useEffect(() => {
    // Only call fetchItem when categories are loaded (i.e., categories is not empty)
    if (categories.length > 0) {
      // Fetch item details for the update form
      const fetchItem = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${API_URL}${id}/`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          data.category = Number(data.category); // Convert category to number
          setItem(data);
          setOriginalItem(data); // Store the original item for comparison

          // Fetch the user's session to check if they are the owner
          const session = await fetchAuthSession();
          console.log(session);
          const currentUser = session.tokens.idToken.payload["cognito:username"];

          if (data.owner !== currentUser) {
            // Redirect to home if the user is not the owner
            navigate('/');
          }

          // Set the selected category ID (category from the fetched item)
          setSelectedCategoryId(data.category);

          // Pre-fill the form with the fetched item data
          form.setFieldsValue(data);
        } catch (error) {
          setError('Failed to fetch item details. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      fetchItem();
    }
  }, [categories, id, form, navigate]);

  // Handle file change and store the selected file in state
  const handleFileChange = ({ fileList }) => {
    if (fileList.length > 0) {
      setNewImageFile(fileList[0].originFileObj); // Save the file in state
    } else {
      setNewImageFile(null); // No file selected
    }
    setFileList(fileList);
  };

  // Upload image to S3 only when update button is pressed
  const uploadImageToS3 = async (file) => {
    try {
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `${Date.now()}-${uuidv4()}.${fileExtension}`;

      await uploadData({
        path: `picture-submissions/${uniqueFileName}`,  // Use the unique filename
        data: file,
        options: {
          contentType: file.type,  // Preserve content type
          acl: 'public-read',
        },
      });

      // return uniqueFileName;
      return`${S3_BASE_URL}${uniqueFileName}`; 
    } catch (err) {
      message.error(`Failed to upload ${file.name}`);
      throw err;
    }
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    setError('');
    setSuccessMessage('');

    const session = await fetchAuthSession();
    const jwtToken = session.tokens.idToken; // Get the JWT token

    // Compare original values and only send the changed fields
    const updatedValues = {};
    Object.keys(values).forEach((key) => {
      if (values[key] !== originalItem[key]) {
        updatedValues[key] = values[key];
      }
    });

    
    // Upload the image only if a new image has been selected
    if (newImageFile) {
      try {
        const uploadedImageKey = await uploadImageToS3(newImageFile);
        updatedValues.image = uploadedImageKey;
      } catch (err) {
        setError('Failed to upload the image. Please try again.');
        return;
      }
    }

    if (Object.keys(updatedValues).length > 0) {
      try {
        const response = await fetch(`${API_URL}${id}/`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${jwtToken}`,
          },
          body: JSON.stringify(updatedValues),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        setSuccessMessage('Item updated successfully!');
        navigate('/', { state: { successMessage: 'Item updated successfully!' } });
      } catch (error) {
        setError('Failed to update item. Please try again.');
      }
    }
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
          'Authorization': `Bearer ${jwtToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setSuccessMessage('Item deleted successfully!');
      navigate('/', { state: { successMessage: 'Item deleted successfully!' } });
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
              <Form.Item label="Category" name="category" rules={[{ required: true, message: 'Please select a category!' }]}>
                <Select
                  placeholder="Select a category"
                  onChange={(value) => setSelectedCategoryId(value)}
                >
                  {categories.map((cat) => (
                    <Option key={cat.id} value={cat.id}>
                      {cat.name}
                    </Option>
                  ))}
                </Select>
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
              <Form.Item label="Current Image">
                <img
                  src={item.image.includes(API_ROOT) ? `${API_ROOT}/imageload?itemid=${item.id}` :item.image.includes(S3_BASE_URL)? `${item.image}`: "https://irsimages.s3.ap-southeast-1.amazonaws.com/picture-submissions/no-img.jpg"}

                  alt={item.title}
                  style={{ width: '100%', height: '300px', objectFit: 'contain', marginBottom: '16px' }}
                />
              </Form.Item>
              <Form.Item label="Upload New Image">
                <Upload
                
                  listType="picture"
                  fileList={fileList}
                  onChange={handleFileChange}
                  beforeUpload={() => false}
                >
                  <Button icon={<UploadOutlined />}>Click to Upload</Button>
                </Upload>
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
