export default {
  expo: {
    name: "Loop Governance",
    slug: "loop-governance",
    scheme: "loopgov",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    ios: {
      bundleIdentifier: "live.loopcmbntr.governance",
      supportsTablet: false,
    },
    android: {
      package: "live.loopcmbntr.governance",
      adaptiveIcon: {
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundColor: "#090909",
      },
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
