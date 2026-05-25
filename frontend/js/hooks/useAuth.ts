import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import {
  usersLoginCreate,
  usersLogoutCreate,
  usersMeRetrieve,
  usersRegisterCreate,
} from '@/js/api';

export const authQueryKey = ['auth', 'me'] as const;

export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const meQuery = useQuery({
    queryKey: authQueryKey,
    queryFn: async () => {
      try {
        const response = await usersMeRetrieve({ throwOnError: true });
        return response.data;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const response = await usersLoginCreate({
        body: payload,
        throwOnError: true,
      });
      return response.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authQueryKey, user);
      navigate('/');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: {
      email: string;
      password: string;
      nickname: string;
      invite_code?: string;
    }) => {
      const response = await usersRegisterCreate({
        body: { ...payload, nickname: payload.nickname },
        throwOnError: true,
      });
      return response.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authQueryKey, user);
      navigate('/');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await usersLogoutCreate({ body: undefined as never, throwOnError: true });
    },
    onSuccess: () => {
      queryClient.setQueryData(authQueryKey, null);
      queryClient.clear();
      navigate('/login');
    },
  });

  return {
    user: meQuery.data,
    isLoading: meQuery.isLoading,
    isAuthenticated: Boolean(meQuery.data),
    error: meQuery.error,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    refetch: meQuery.refetch,
  };
}
