import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { COLORS } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import AuthService from '../../services/authService';

export default function SplashScreen({ navigation }) {
    useEffect(() => {
        const bootstrap = async () => {
            // Minimum splash display time (UX)
            const minDisplay = new Promise(resolve => setTimeout(resolve, 1500));

            // Session restore runs in parallel with the timer
            const sessionCheck = AuthService.restoreSession();

            const [, session] = await Promise.all([minDisplay, sessionCheck]);

            if (session.isAuthenticated && session.navTarget !== 'Auth') {
                // Returning user — go directly to their dashboard
                navigation.replace(session.navTarget);
            } else {
                // New user or expired session — show onboarding
                navigation.replace('Onboarding');
            }
        };

        bootstrap();
    }, [navigation]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Image
                    source={require('../../../assets/splash_fixed.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: '90%',
        height: '20%',
    }
});
