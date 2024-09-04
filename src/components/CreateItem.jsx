import React, { useState } from 'react';
import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import { Upload, Button, Form, Row, Col, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { withAuthenticator, Heading } from '@aws-amplify/ui-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import { uploadData } from 'aws-amplify/storage';



const { Dragger } = Upload;

function CreateItem({ signOut }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState([
    { id: '1', file: null, preview: null },
    { id: '2', file: null, preview: null },
    { id: '3', file: null, preview: null },
    { id: '4', file: null, preview: null },
  ]);
  const [error, setError] = useState('');

  const handleFileChange = (event, index) => {
    const file = event.file.originFileObj;
    if (!file || !file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }

    setError(''); // Reset error message

    // Create a preview URL for the selected image
    const preview = URL.createObjectURL(file);

    // Update the specific image object in the state
    const newImages = [...images];
    newImages[index] = { ...newImages[index], file, preview };
    setImages(newImages);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const newImages = Array.from(images);
    const [movedImage] = newImages.splice(result.source.index, 1);
    newImages.splice(result.destination.index, 0, movedImage);

    setImages(newImages);
  };

  const handleSubmit = async () => {
    const validImages = images.filter((image) => image.file);

    if (validImages.length < 1) {
      setError('Please select at least one image.');
      return;
    }

    try {
      const uploadPromises = validImages.map(async (image, index) => {
        const formData = new FormData();
        formData.append('file', image.file);
        formData.append('order', index + 1);

        uploadData({
          path: `photos/${image.file.name}`,
          data: image.file,
          options: {
            bucket: 'irsimages',
          },
        });

       

        return { url: response.data.url, order: index + 1 };
      });

      const uploadedImages = await Promise.all(uploadPromises);
      message.success('Images uploaded successfully!');
      console.log('Uploaded images:', uploadedImages);
    } catch (error) {
      console.error('Error uploading images:', error);
      setError('Failed to upload images. Please try again.');
    }
  };

  return (
    <div>
      <Heading level={2}>Create Item</Heading>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <Form layout="vertical" onFinish={handleSubmit}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="images-droppable" direction="horizontal">
            {(provided) => (
              <div
                className="image-boxes"
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                {images.map((image, index) => (
                  <Draggable key={image.id} draggableId={image.id} index={index}>
                    {(provided) => (
                      <div
                        className="image-box"
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          marginRight: '10px',
                          textAlign: 'center',
                        }}
                      >
                        <div className="order-number">{index + 1}</div>
                        {image.preview ? (
                          <img
                            src={image.preview}
                            alt={`Preview ${index + 1}`}
                            className="image-preview"
                            style={{
                              width: '100px',
                              height: '100px',
                              objectFit: 'cover',
                              marginBottom: '10px',
                            }}
                          />
                        ) : (
                          <div
                            className="placeholder"
                            style={{
                              width: '100px',
                              height: '100px',
                              border: '1px dashed #d9d9d9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            Select Image
                          </div>
                        )}
                        <Dragger
                          beforeUpload={(file) => {
                            handleFileChange({ file }, index);
                            return false;
                          }}
                          showUploadList={false}
                          accept="image/*"
                        >
                          <Button>Upload</Button>
                        </Dragger>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={uploading}>
            Upload Images
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default withAuthenticator(CreateItem, { variation: 'default' });
