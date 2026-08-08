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
import { colors } from './theme';

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
        options={{ headerShown: true, title: '⭐ Rate Worker', headerStyle: { backgroundColor: colors.primary }, headerTintColor: colors.textInverse, headerTitleStyle: { fontWeight: '700' } }}
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
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: colors.surface,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingBottom: 8,
              paddingTop: 8,
              height: 62,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 5,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSecondary,
            tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
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
