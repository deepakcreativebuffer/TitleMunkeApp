import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {NavigatorScreenParams} from '@react-navigation/native';
import type {NearbyProperty} from '../data/nearbyProperties';

// Bottom-tab routes (the tabs inside TabNavigator).
export type TabParamList = {
  Home: undefined;
  SearchHistory: undefined;
  Messages: undefined;
  NearbySearch: undefined;
  Requests: undefined;
};

export type AppStackParamList = {
  SplashScreen: undefined;
  OnboardingScreen: undefined;
  LoginScreen: undefined;
  ForgotPassword: undefined;
  TabNavigator: NavigatorScreenParams<TabParamList> | undefined;
  PropertyReport: {address: string; when: string; searchId?: string};
  SearchProgress: undefined;
  SearchMap: {
    items: Array<{
      id: string;
      address: string;
      when: string;
      status: string;
      searchId?: string;
      latitude?: number;
      longitude?: number;
    }>;
  };
  NearbySearch: undefined;
  NearbyMap: {
    property?: NearbyProperty;
    properties?: NearbyProperty[];
    title?: string;
  };
  Messages: undefined;
  Chat: {
    // Existing conversation (from the list / groups). Absent for a brand-new
    // 1-1 chat, where `toUserId` is provided instead and the conversation is
    // created on the first message.
    conversationId?: number;
    toUserId?: number;
    title?: string;
    isGroup?: boolean;
    groupId?: number;
  };
  NewChat: undefined;
  NewGroup: undefined;
  GroupInfo: {conversationId: number; groupId: number; title?: string};
  ContactInfo: {conversationId: number; title?: string};
  DocumentViewer: {
    url: string;
    name?: string;
    type?: string;
    fileKey?: string;
    isImage?: boolean;
  };
  WebPage: {url: string; title: string};
  Agents: undefined;
  AddAgent: {agent?: AgentFormParam} | undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  AiGovernance: undefined;
  AdvancedSettings: undefined;
  AgentDetails: {agentId: string; name?: string};
  BrokerDetails: {brokerId: string; name?: string};
  OrgDetails: {orgId: string; name?: string};
  AdminBrokerDetails: {brokerId: string; name?: string};
  Search: undefined;
  Requests: undefined;
  Settings: undefined;
  Logs: undefined;
  OrgUsers: undefined;
  AdminUsers: undefined;
  AddOrgUser: {
    kind: 'broker' | 'agent' | 'organisation' | 'admin';
    user?: OrgUserParam;
  };
  // Add new screen routes here
};

// User payload passed to the Add/Edit org-user screen (edit mode when present).
export type OrgUserParam = {
  id: string;
  name: string;
  email: string;
  teamStrength?: string | number;
  searchLimit?: string;
  brokerId?: string;
};

// Agent payload passed to the Add/Edit Agent screen (edit mode when present).
export type AgentFormParam = {
  id: string;
  name: string;
  email: string;
  searchLimit: string;
};

// Helper type for screen props
export type AppScreenProps<T extends keyof AppStackParamList> =
  NativeStackScreenProps<AppStackParamList, T>;

// Nested stack inside the Home tab
export type HomeStackParamList = {
  Dashboard: undefined;
  SearchHistory: undefined;
};

export type HomeScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;
