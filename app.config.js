import 'dotenv/config';

export default {
    expo: {
        name: "Sara Medico",
        slug: "sara-medico-mobile",
        version: "1.0.1",
        orientation: "portrait",
        icon: "./assets/icon_new.png",
        splash: {
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },
        userInterfaceStyle: "light",
        android: {
            package: "com.saramedico.app",
            adaptiveIcon: {
                foregroundImage: "./assets/icon_new.png",
                backgroundColor: "#ffffff"
            }
        },
        extra: {
            eas: {
                projectId: "add88ac5-6bb0-426b-9def-915fac70a60c"
            },
            // API Configuration - strictly loaded from .env file or local defaults
            API_ENVIRONMENT: process.env.API_ENVIRONMENT || "local",
            AWS_API_URL: process.env.AWS_API_URL || "http://107.20.98.130:8000",
            LOCAL_API_HOST: process.env.LOCAL_API_HOST || "localhost",
            LOCAL_API_PORT: process.env.LOCAL_API_PORT || "8000"
        },
        ios: {
            bundleIdentifier: "com.yourname.yourapp"
        },
        plugins: [
            "expo-font",
            "@react-native-community/datetimepicker",
            [
                "expo-build-properties",
                {
                    "android": {
                        "minSdkVersion": 28,
                        "newArchEnabled": true,
                        "ndkVersion": "27.1.12297006"
                    }
                }
            ],
            "./plugins/withAndroidAllowBackup",
            "./plugins/withAndroidCleartext"
        ]
    }
};
