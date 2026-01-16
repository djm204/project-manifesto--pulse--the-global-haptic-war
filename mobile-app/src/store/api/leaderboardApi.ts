import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from './baseQuery';
import { LeaderboardRequest, LeaderboardResponse } from '../../types/leaderboard';
import { SecurityService } from '../../services/SecurityService';

export const leaderboardApi = createApi({
  reducerPath: 'leaderboardApi',
  baseQuery: baseQuery,
  tagTypes: ['Leaderboard'],
  endpoints: (builder) => ({
    getLeaderboard: builder.query<LeaderboardResponse, LeaderboardRequest>({
      query: (params) => {
        const sanitizedParams = SecurityService.sanitizeRequestParams(params);
        return {
          url: '/leaderboard',
          method: 'GET',
          params: sanitizedParams,
        };
      },
      providesTags: ['Leaderboard'],
      transformResponse: (response: any) => {
        return {
          ...response,
          entries: response.entries.map((entry: any) => ({
            ...entry,
            username: SecurityService.sanitizeUserData(entry.username),
          })),
        };
      },
    }),
    updateUserScore: builder.mutation<void, { score: number }>({
      query: (body) => ({
        url: '/leaderboard/score',
        method: 'POST',
        body: SecurityService.encryptSensitiveData(body),
      }),
      invalidatesTags: ['Leaderboard'],
    }),
  }),
});

export const { useGetLeaderboardQuery, useUpdateUserScoreMutation } = leaderboardApi;