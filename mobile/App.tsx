import { useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { WorkflowsScreen } from './src/screens/WorkflowsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Workflows: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function MainTabs() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

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
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Dashboard: 'grid-outline',
            Workflows: 'flash-outline',
            Settings: 'person-outline',
          };
          return <Ionicons name={icons[route.name]} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Workflows" component={WorkflowsScreen} options={{ tabBarLabel: 'Workflows' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Compte' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
