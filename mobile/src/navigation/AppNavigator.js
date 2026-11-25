import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../styles/theme';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CustomerHomeScreen from '../screens/CustomerHomeScreen';
import BusinessDetailScreen from '../screens/BusinessDetailScreen';
import MyQueueScreen from '../screens/MyQueueScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProviderDashboardScreen from '../screens/ProviderDashboardScreen';
import ManageBusinessScreen from '../screens/ManageBusinessScreen';
import QRScannerScreen from '../screens/QRScannerScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.bg },
  headerTintColor: COLORS.text,
  headerShadowVisible: false,
  headerTitleStyle: { fontWeight: '700' },
};

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarActiveTintColor: COLORS.deepGreen,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: COLORS.border },
      }}
    >
      <Tab.Screen name="Explore" component={CustomerHomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="MyQueue" component={MyQueueScreen} options={{ title: 'My Queue', headerShown: false }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Account" component={ProfileScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

function ProviderTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        ...screenOptions,
        tabBarActiveTintColor: COLORS.deepGreen,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: { backgroundColor: COLORS.card, borderTopColor: COLORS.border },
      }}
    >
      <Tab.Screen name="Dashboard" component={ProviderDashboardScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Account" component={ProfileScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator size="large" color={COLORS.deepGreen} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
          </>
        ) : user.role === 'provider' ? (
          <>
            <Stack.Screen name="ProviderHome" component={ProviderTabs} options={{ headerShown: false }} />
            <Stack.Screen name="ManageBusiness" component={ManageBusinessScreen} options={{ title: 'Business' }} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ title: 'Scan Ticket QR' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="CustomerHome" component={CustomerTabs} options={{ headerShown: false }} />
            <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} options={{ title: 'Queue Details' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
