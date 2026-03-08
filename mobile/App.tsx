/**
 * OpenScreen Mobile App – Main Entry
 * Bottom tab navigation: Remote | Preview | Ideas | Connect
 */
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";

import ConnectScreen from "./screens/ConnectScreen";
import IdeasScreen from "./screens/IdeasScreen";
import PreviewScreen from "./screens/PreviewScreen";
import RemoteScreen from "./screens/RemoteScreen";

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.45 }}>{label}</Text>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: "#0e0e16",
              borderTopColor: "rgba(255,255,255,0.07)",
              borderTopWidth: 1,
              height: 70,
              paddingBottom: 10,
            },
            tabBarActiveTintColor: "#a78bfa",
            tabBarInactiveTintColor: "#4b5563",
            tabBarLabelStyle: { fontSize: 11, marginTop: -2 },
          }}
        >
          <Tab.Screen
            name="Remote"
            component={RemoteScreen}
            options={{
              tabBarIcon: ({ focused }) => <TabIcon label="⏺" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Preview"
            component={PreviewScreen}
            options={{
              tabBarIcon: ({ focused }) => <TabIcon label="🖥" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Ideas"
            component={IdeasScreen}
            options={{
              tabBarIcon: ({ focused }) => <TabIcon label="💡" focused={focused} />,
            }}
          />
          <Tab.Screen
            name="Connect"
            component={ConnectScreen}
            options={{
              tabBarIcon: ({ focused }) => <TabIcon label="📡" focused={focused} />,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({});
