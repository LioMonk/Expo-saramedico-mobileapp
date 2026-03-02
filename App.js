import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import Modular Navigators
import AuthNavigator from './src/navigation/AuthNavigator';
import PatientNavigator from './src/navigation/PatientNavigator';
import DoctorNavigator from './src/navigation/DoctorNavigator';
import AdminNavigator from './src/navigation/AdminNavigator';
import HospitalNavigator from './src/navigation/HospitalNavigator';
import SplashScreen from './src/screens/startup/SplashScreen';
import OnboardingScreen from './src/screens/startup/OnboardingScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            // Standard iOS-style slide animation for all screens
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        >
          {/* 0. Startup Flow */}
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />

          {/* 1. Auth Stack 
            (Contains Login, SignUp, OTP, ResetPassword) 
          */}
          <Stack.Screen name="Auth" component={AuthNavigator} />

          {/* 2. Role-Based Stacks 
            Note: The 'name' props here (e.g., 'DoctorFlow') match 
            exactly what you call in LoginScreen: navigation.replace('DoctorFlow')
          */}
          <Stack.Screen name="PatientFlow" component={PatientNavigator} />
          <Stack.Screen name="DoctorFlow" component={DoctorNavigator} />
          <Stack.Screen name="AdminFlow" component={AdminNavigator} />
          <Stack.Screen name="HospitalFlow" component={HospitalNavigator} />

        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}