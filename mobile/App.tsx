import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { LanguageProvider, useLang } from './src/contexts/LanguageContext';
import { registerPushToken } from './src/utils/pushNotifications';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { WorkflowsScreen } from './src/screens/WorkflowsScreen';
import { WorkflowCreateScreen } from './src/screens/WorkflowCreateScreen';
import { RunsScreen } from './src/screens/RunsScreen';
import { RunDetailScreen } from './src/screens/RunDetailScreen';
import { ServicesScreen } from './src/screens/ServicesScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  WorkflowCreate: undefined;
  WorkflowRuns: { workflowId: string; workflowName: string };
  RunDetail: { runId: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Workflows: undefined;
  Services: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'grid-outline',
  Workflows: 'flash-outline',
  Services: 'apps-outline',
  Notifications: 'notifications-outline',
  Settings: 'person-outline',
};

function MainTabs() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const { t } = useLang();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: dark ? '#0a0a0a' : '#ffffff',
          borderTopColor: dark ? '#2a2a2a' : '#e5e7eb',
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 24,
          paddingTop: 10,
        },
        tabBarActiveTintColor: dark ? '#ffffff' : '#000000',
        tabBarInactiveTintColor: dark ? '#3a3a3a' : '#c0c0c0',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size - 2} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard"     component={DashboardScreen}     options={{ tabBarLabel: t.tabHome }} />
      <Tab.Screen name="Workflows"     component={WorkflowsScreen}     options={{ tabBarLabel: t.tabWorkflows }} />
      <Tab.Screen name="Services"      component={ServicesScreen}      options={{ tabBarLabel: t.tabServices }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarLabel: t.tabNotifs }} />
      <Tab.Screen name="Settings"      component={SettingsScreen}      options={{ tabBarLabel: t.tabAccount }} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => { registerPushToken(); }, []);

  return (
    <LanguageProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="WorkflowCreate" component={WorkflowCreateScreen} />
          <Stack.Screen name="WorkflowRuns"  component={RunsScreen} />
          <Stack.Screen name="RunDetail"     component={RunDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}
