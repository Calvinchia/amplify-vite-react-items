import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Drawer, Modal } from 'antd';
import { Link } from 'react-router-dom';
import { useAuthenticator, Authenticator } from '@aws-amplify/ui-react';
import { MenuOutlined } from '@ant-design/icons';

const { Header } = Layout;

const Navigation = () => {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // State for controlling drawer visibility
  const [isModalOpen, setIsModalOpen] = useState(false); // State for login/signup modal visibility
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768); // Check if screen is mobile

  // Track window resizing to update `isMobile` state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Close modal if user is signed in
  useEffect(() => {
    if (user) {
      setIsModalOpen(false); // Close modal when the user signs in
    }
  }, [user]);

  // Function to open the drawer (mobile menu)
  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
  };

  // Function to close the drawer
  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  // Function to open the login/signup modal
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  // Function to close the login/signup modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Menu items that collapse into the hamburger menu on mobile
  const menuItems = [
    {
      key: '1',
      label: <Link to="/">Stuff</Link>,
    },
  ];

  // Add authenticated user items
  if (user) {
    menuItems.push(
      {
        key: '2',
        label: <Link to="/create">Create Item</Link>,
      }
    );
  }

  return (
    <>
      <Layout>
        <Header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>irentstuff.app</Link>


          {/* Flex container for menu and buttons */}
          <div style={{ display: 'flex', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
            {!isMobile && (
              // Show normal menu on desktop, aligned to the right
              <Menu
                theme="light"
                mode="horizontal"
                items={menuItems}
                style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }} // Align menu items to the right
              />
            )}

            {/* Log in / Sign out button remains visible regardless of mobile or desktop */}
            {user ? (
              <Button type="primary" onClick={signOut} style={{ marginLeft: '10px' }}>
                Sign out
              </Button>
            ) : (
              <Button type="primary" onClick={handleOpenModal} style={{ marginLeft: '10px' }}>
                Log in / Sign up
              </Button>
            )}
          </div>

          {isMobile && (
            // Show hamburger icon on mobile
            <Button type="primary" icon={<MenuOutlined />} onClick={handleOpenDrawer} />
          )}
        </Header>
      </Layout>

      {/* Drawer for mobile navigation */}
      <Drawer
        title="Menu"
        placement="right"
        onClose={handleCloseDrawer}
        open={isDrawerOpen}
        //bodyStyle={{ padding: 0 }}
      >
        <Menu mode="vertical" items={menuItems} onClick={handleCloseDrawer} />
        {!user && (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Button type="primary" onClick={handleOpenModal}>
              Log in / Sign up
            </Button>
          </div>
        )}
      </Drawer>

      {/* Modal for Login/Signup */}
      <Modal
        open={isModalOpen}
        onCancel={handleCloseModal}
        footer={null}
        destroyOnClose={true} // Ensure that form resets when the modal closes
      >
        {!user && (
          <Authenticator
            initialState="signIn" // Default to sign in, but users can switch to sign up
          />
        )}
      </Modal>
    </>
  );
};

export default Navigation;
