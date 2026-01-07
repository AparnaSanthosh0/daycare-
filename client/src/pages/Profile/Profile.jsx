import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useShop } from '../../contexts/ShopContext';
import Layout from '../../components/Layout/Layout';
import EcommerceProfile from './EcommerceProfile';
import DashboardProfile from './DashboardProfile';

const Profile = () => {
  const { user } = useAuth();
  const { isEcommerceContext } = useShop();

  // If user is in ecommerce context (shop, cart, etc.) or is a customer, show ecommerce profile
  if (isEcommerceContext || user?.role === 'customer') {
    return <EcommerceProfile />;
  }

  // If user is delivery staff, render profile without Layout (like delivery dashboard)
  if (user?.role === 'staff' && user?.staff?.staffType === 'delivery') {
    return <DashboardProfile />;
  }

  // For all other users (admin, staff, parent, vendor), show dashboard profile with Layout
  return (
    <Layout>
      <DashboardProfile />
    </Layout>
  );
};

export default Profile;