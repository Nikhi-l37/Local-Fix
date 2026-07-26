import React from 'react';
import { StatusBar, Text as RNText } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import RateWorkerScreen from './screens/RateWorkerScreen';
import WorkerLoginScreen from './screens/WorkerLoginScreen';
import WorkerDashboardScreen from './screens/WorkerDashboardScreen';

const Tab = createBottomTabNavigator();
const UserStack = createNativeStackNavigator();
const WorkerStack = createNativeStackNavigator();

function UserStackScreen() {
  return (
    <UserStack.Navigator screenOptions={{ headerShown: false }}>
      <UserStack.Screen name="Home" component={HomeScreen} />
      <UserStack.Screen
        name="RateWorker"
        component={RateWorkerScreen}
        options={{ headerShown: true, title: '⭐ Rate Worker', headerStyle: { backgroundColor: '#f0f4f8' }, headerTintColor: '#2d3748' }}
      />
    </UserStack.Navigator>
  );
}

function WorkerStackScreen() {
  return (
    <WorkerStack.Navigator screenOptions={{ headerShown: false }}>
      <WorkerStack.Screen name="WorkerLogin" component={WorkerLoginScreen} />
      <WorkerStack.Screen name="WorkerDashboard" component={WorkerDashboardScreen} />
    </WorkerStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1a56a0" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopWidth: 1,
              borderTopColor: '#e2e8f0',
              paddingBottom: 6,
              paddingTop: 6,
              height: 60,
            },
            tabBarActiveTintColor: '#3182ce',
            tabBarInactiveTintColor: '#a0aec0',
            tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
          }}
        >
          <Tab.Screen
            name="FindWorker"
            component={UserStackScreen}
            options={{
              tabBarLabel: 'Find Worker',
              tabBarIcon: ({ color }) => <TabIcon emoji="🔍" color={color} />,
            }}
          />
          <Tab.Screen
            name="ImAWorker"
            component={WorkerStackScreen}
            options={{
              tabBarLabel: "I'm a Worker",
              tabBarIcon: ({ color }) => <TabIcon emoji="👷" color={color} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}


function TabIcon({ emoji }) {
  return <RNText style={{ fontSize: 22 }}>{emoji}</RNText>;
}
