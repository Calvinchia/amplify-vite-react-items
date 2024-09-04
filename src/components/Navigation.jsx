import React from 'react';
import { Layout, Menu, Button } from 'antd';
import { Link } from 'react-router-dom';

const { Header } = Layout;

const Navigation = ({ signOut }) => {
  const menuItems = [
    {
      key: '1',
      label: <Link to="/">Home</Link>,
    },
    {
      key: '2',
      label: <Link to="/create">Create Item</Link>,
    },
    {
      key: '3',
      label: <Button type="primary" onClick={signOut}>Sign out</Button>,
    }
  ];

  return (
    <Layout>
      <Header className="header">
        <div className="logo" />
        <Menu theme="light" mode="horizontal" items={menuItems} />
      </Header>
    </Layout>
  );
};

export default Navigation;
