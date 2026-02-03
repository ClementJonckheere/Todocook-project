import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.todocook.app",
  appName: "TodoCook",
  webDir: "out",
  server: {
    // For development, point to local dev server:
    // url: "http://192.168.1.X:3000",
    // cleartext: true,

    // For production, the app uses the bundled static files (webDir: "out")
    androidScheme: "https",
  },
  plugins: {
    StatusBar: {
      backgroundColor: "#16a34a",
      style: "LIGHT",
      overlaysWebView: false,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#16a34a",
      showSpinner: true,
      spinnerColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#f5f5f5",
  },
  ios: {
    backgroundColor: "#f5f5f5",
    contentInset: "always",
    preferredContentMode: "mobile",
    scheme: "TodoCook",
  },
};

export default config;
