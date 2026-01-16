import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../store';
import { PulseSession, LeaderboardEntry, AdReward } from '../types';

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.globalpulse.com/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

export const pulseApi = createApi({
  reducerPath: 'pulseApi',
  baseQuery,
  tagTypes: ['Pulse', 'Leaderboard', 'User', 'Ad'],
  endpoints: (builder) => ({
    getCurrentPulse: builder.query<PulseSession, void>({
      query: () => '/pulse/current',
      providesTags: ['Pulse'],
    }),
    joinPulse: builder.mutation<{ success: boolean; pulseId: string }, { userId: string }>({
      query: (body) => ({
        url: '/pulse/join',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pulse'],
    }),
    getLeaderboard: builder.query<LeaderboardEntry[], { type: 'global' | 'local'; limit?: number }>({
      query: ({ type, limit = 100 }) => `/leaderboard/${type}?limit=${limit}`,
      providesTags: ['Leaderboard'],
    }),
    claimAdReward: builder.mutation<AdReward, { adId: string; userId: string }>({
      query: (body) => ({
        url: '/ads/claim-reward',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User', 'Ad'],
    }),
    getUserProfile: builder.query<{ id: string; score: number; rank: number }, string>({
      query: (userId) => `/users/${userId}`,
      providesTags: ['User'],
    }),
  }),
});

export const {
  useGetCurrentPulseQuery,
  useJoinPulseMutation,
  useGetLeaderboardQuery,
  useClaimAdRewardMutation,
  useGetUserProfileQuery,
} = pulseApi;