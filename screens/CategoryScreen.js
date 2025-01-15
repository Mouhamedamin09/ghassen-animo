// screens/CategoryScreen.js
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Layout from '../Layouts/Layout';

// Import individual category components
import CategoryTab from '../components/CategoryTab';

const Tab = createMaterialTopTabNavigator();

const CategoryScreen = () => {
  return (
    <Layout>
    <Tab.Navigator
      initialRouteName="Movies"
      screenOptions={{
        tabBarActiveTintColor: '#fff',
        tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold' },
        tabBarStyle: { backgroundColor: '#262626' },
        tabBarIndicatorStyle: { backgroundColor: '#5abf75' },
      }}
    >
      <Tab.Screen
        name="Movies"
        children={() => <CategoryTab categoryName="movie" />}
      />
      <Tab.Screen
        name="ONA"
        children={() => <CategoryTab categoryName="ona" />}
      />
      <Tab.Screen
        name="OVA"
        children={() => <CategoryTab categoryName="ova" />}
      />
      <Tab.Screen
        name="TV"
        children={() => <CategoryTab categoryName="tv" />}
      />
    </Tab.Navigator>
    </Layout>
  );
};

export default CategoryScreen;
