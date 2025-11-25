import { useRouter } from 'expo-router';
import GoogleSignInButton from '../../src/services/GoogleSignInButton';

export default function DriverLogin() {
  const router = useRouter();

  return (
    <GoogleSignInButton onSuccess={() => router.replace('/driver/driver_home')} />
  );
} 