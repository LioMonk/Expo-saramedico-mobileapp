import 'dotenv/config';

export default {
    expo: {
        name: "Sara Medico",
        slug: "your-app",
        version: "1.0.1",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        android: {
            package: "com.saramedico.app",
            adaptiveIcon: {
                foregroundImage: "./assets/icon.png",
                backgroundColor: "#ffffff"
            }
        },
        extra: {
            eas: {
                projectId: "eedea6cc-7eaa-4065-a88e-17bb3487b8ff"
            },
            // API Configuration - loaded from .env file
            API_ENVIRONMENT: process.env.API_ENVIRONMENT || "aws",
            AWS_API_URL: process.env.AWS_API_URL || "http://65.0.98.170:8000",
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
                        "newArchEnabled": false
                    }
                }
            ],
            "./plugins/withAndroidAllowBackup",
            "./plugins/withAndroidCleartext"
        ]
    }
};
