import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';

import { HomeIcon } from '../components/icons/HomeIcon';
import { CloudIcon } from '../components/icons/CloudIcon';
import { SearchIcon } from '../components/icons/SearchIcon';
import { StatsIcon } from '../components/icons/StatsIcon';
import { HelpCircleIcon } from '../components/icons/HelpCircleIcon';

import { MainScreen } from '../screens/MainScreen';
import { CollectionScreen } from '../screens/CollectionScreen';
import { DiaryReadScreen } from '../screens/DiaryReadScreen';
import { DiaryWriteScreen } from '../screens/DiaryWriteScreen';
import { YearCalendarScreen } from '../screens/YearCalendarScreen';
import { MonthCalendarScreen } from '../screens/MonthCalendarScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { TabScreenLayout } from '../components/TabScreenLayout';
import { BackupPopupMenu } from '../components/BackupPopupMenu';
import type { HomeStackParamList, RootStackParamList } from './types';

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F3F4F6',
  },
};

const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="Main"
        component={MainScreenWrapper}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="Collection"
        component={CollectionScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="DiaryRead"
        component={DiaryReadScreen}
        options={{
          gestureEnabled: false,
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name="YearCalendar"
        component={YearCalendarScreen}
        options={{ title: '연도 선택' }}
      />
      <HomeStack.Screen
        name="MonthCalendar"
        component={MonthCalendarScreen}
        options={{ title: '월 선택' }}
      />
    </HomeStack.Navigator>
  );
};

const MainScreenWrapper = ({ navigation }: { navigation: any }) => {
  return (
    <MainScreen
      onPressDiary={() => navigation.navigate('DiaryRead')}
      onPressCollection={() => navigation.navigate('Collection')}
      onPressDate={(date) => navigation.navigate('DiaryRead', { date: date.toISOString() })}
    />
  );
};

const PlaceholderScreen = ({ label }: { label: string }) => (
  <TabScreenLayout>
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderText}>{label}</Text>
    </View>
  </TabScreenLayout>
);

const TabBarItem = ({
  label,
  iconName,
  focused,
  renderIcon,
}: {
  label: string;
  iconName?: string;
  focused: boolean;
  renderIcon?: (color: string) => React.ReactNode;
}) => (
  <View style={styles.tabItem}>
    {renderIcon ? (
      renderIcon(focused ? '#111827' : '#9CA3AF')
    ) : (
      <FeatherIcon
        name={iconName as string}
        size={24}
        color={focused ? '#111827' : '#9CA3AF'}
        style={styles.tabIcon}
      />
    )}
    <Text
      style={[styles.tabLabel, focused && styles.tabFocusedText]}
      numberOfLines={1}
      ellipsizeMode="clip">
      {label}
    </Text>
  </View>
);

const CenterHomeButton: React.FC<BottomTabBarButtonProps> = ({ onPress }) => (
  <TouchableOpacity
    style={styles.centerHomeButton}
    activeOpacity={0.8}
    onPress={onPress}>
    <HomeIcon color="#f5f3f4" size={34} />
  </TouchableOpacity>
);

const TabsNavigator = ({ navigation }: { navigation: any }) => {
  const [backupPopupVisible, setBackupPopupVisible] = useState(false);

  return (
    <>
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 92 : 82,
          paddingLeft: 15,
          paddingRight: 15,
          borderTopWidth: 0,
          backgroundColor: '#F3F4F6',
        },
        tabBarItemStyle: {
          paddingTop: 7,
          paddingBottom: 2,
        },
      }}>

      <Tab.Screen
        name="ReminderTab"
        children={() => <PlaceholderScreen label="도구" />}
        options={{
          title: '도구',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => (
            <TabBarItem
              label="도구"
              focused={focused}
              renderIcon={color => <HelpCircleIcon color={color} size={24} />}
            />
          ),
        }}
      />
        <Tab.Screen
            name="SearchTab"
            children={() => <PlaceholderScreen label="검색" />}
            options={{
                title: '검색',
                tabBarLabel: () => null,
                tabBarIcon: ({ focused }) => (
                    <TabBarItem
                        label="검색"
                        focused={focused}
                        renderIcon={color => <SearchIcon color={color} size={24} />}
                    />
                ),
            }}
        />
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: '홈',
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: props => (
            <CenterHomeButton
              {...props}
              onPress={() =>
                navigation.navigate('Tabs', {
                  screen: 'HomeTab',
                  params: { screen: 'Main' },
                })
              }
            />
          ),
        }}
      />
        <Tab.Screen
            name="StatsTab"
            children={() => <PlaceholderScreen label="통계" />}
            options={{
                title: '통계',
                tabBarLabel: () => null,
                tabBarIcon: ({ focused }) => (
                    <TabBarItem
                        label="통계"
                        focused={focused}
                        renderIcon={color => <StatsIcon color={color} size={24} />}
                    />
                ),
            }}
        />

        <Tab.Screen
            name="BackupTab"
            children={() => null}
            options={{
                title: '백업',
                tabBarLabel: () => null,
                tabBarIcon: ({ focused }) => (
                    <TabBarItem
                        label="백업"
                        focused={focused}
                        renderIcon={color => <CloudIcon color={color} size={24} />}
                    />
                ),
                tabBarButton: props => {
                    const { style, ...rest } = props;
                    const safeRest = Object.fromEntries(
                        Object.entries(rest).map(([k, v]) => [k, v === null ? undefined : v])
                    );
                    return (
                        <TouchableOpacity
                            {...safeRest}
                            onPress={() => setBackupPopupVisible(true)}
                            style={[styles.backupTabButton, style]}
                        />
                    );
                },
            }}
        />

    </Tab.Navigator>
    <BackupPopupMenu
        visible={backupPopupVisible}
        onClose={() => setBackupPopupVisible(false)}
    />
    </>
  );
};

export const RootNavigator = () => {
  return (
    <NavigationContainer theme={AppTheme}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Tabs" component={TabsNavigator} />
        <RootStack.Screen
          name="DiaryWrite"
          component={DiaryWriteScreen}
          options={{
            // 기본 카드 전환 애니메이션으로 전체 화면 전환
            presentation: 'card',
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 18,
    color: '#6B7280',
  },
  centerHomeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    transform: [{ translateX: 4 }],
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  tabIcon: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  tabFocusedText: {
    color: '#111827',
    fontWeight: '600',
  },
  backupTabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 7,
    paddingBottom: 2,
    paddingHorizontal: 4,
  },
});

