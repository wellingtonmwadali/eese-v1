import { useEffect } from 'react';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const Home: NextPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [user, loading, router]);

  return null;
};

export default Home;
