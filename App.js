import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import Modular Navigators
import AuthNavigator from './src/navigation/AuthNavigator';
import PatientNavigator from './src/navigation/PatientNavigator';
import DoctorNavigator from './src/navigation/DoctorNavigator';
import AdminNavigator from './src/navigation/AdminNavigator';
import HospitalNavigator from './src/navigation/HospitalNavigator';
import AuthService from './src/services/authService';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Auth');

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await AuthService.restoreSession();
        if (session.isAuthenticated && session.navTarget !== 'Auth') {
          setInitialRoute(session.navTarget);
        }
      } catch (e) {
        console.log('[App] Session restoration failed:', e);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <Image
          source={require('./assets/icon_new.png')}
          style={{ width: '40%', height: '20%' }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{
              headerShown: false,
              // Standard iOS-style slide animation for all screens
              cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          >
            {/* 1. Auth Stack  */}
            <Stack.Screen name="Auth" component={AuthNavigator} />

            {/* 2. Role-Based Stacks */}
            <Stack.Screen name="PatientFlow" component={PatientNavigator} />
            <Stack.Screen name="DoctorFlow" component={DoctorNavigator} />
            <Stack.Screen name="AdminFlow" component={AdminNavigator} />
            <Stack.Screen name="HospitalFlow" component={HospitalNavigator} />

          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}