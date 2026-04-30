import Constants from 'expo-constants';

const envBase = (process.env.EXPO_PUBLIC_API_BASE || '').trim();

// LAN fallback for local development in Expo Go (phone + laptop same Wi-Fi).
const hostUri = Constants.expoConfig?.hostUri || '';
const lanHost = hostUri ? hostUri.split(':')[0] : '';
const lanFallback = lanHost ? `http://${lanHost}:5000` : 'http://localhost:5000';

const API_BASE = envBase || lanFallback;

export default API_BASE;
