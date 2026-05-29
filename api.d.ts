import type { QueryKey, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { GetFixturesParams, GetMatchH2HParams, GetScoresParams, GetStandingsParams, GetTeamParams, GetTopScorersParams, H2HResult, HealthStatus, Match, MatchDetail, NewsArticle, Scorer, Standing, TeamDetail } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetLiveMatchesUrl: () => string;
/**
 * @summary Get live matches
 */
export declare const getLiveMatches: (options?: RequestInit) => Promise<Match[]>;
export declare const getGetLiveMatchesQueryKey: () => readonly ["/api/football/live"];
export declare const getGetLiveMatchesQueryOptions: <TData = Awaited<ReturnType<typeof getLiveMatches>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLiveMatches>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLiveMatches>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLiveMatchesQueryResult = NonNullable<Awaited<ReturnType<typeof getLiveMatches>>>;
export type GetLiveMatchesQueryError = ErrorType<unknown>;
/**
 * @summary Get live matches
 */
export declare function useGetLiveMatches<TData = Awaited<ReturnType<typeof getLiveMatches>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLiveMatches>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetScoresUrl: (params?: GetScoresParams) => string;
/**
 * @summary Get scores for a date
 */
export declare const getScores: (params?: GetScoresParams, options?: RequestInit) => Promise<Match[]>;
export declare const getGetScoresQueryKey: (params?: GetScoresParams) => readonly ["/api/football/scores", ...GetScoresParams[]];
export declare const getGetScoresQueryOptions: <TData = Awaited<ReturnType<typeof getScores>>, TError = ErrorType<unknown>>(params?: GetScoresParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getScores>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getScores>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetScoresQueryResult = NonNullable<Awaited<ReturnType<typeof getScores>>>;
export type GetScoresQueryError = ErrorType<unknown>;
/**
 * @summary Get scores for a date
 */
export declare function useGetScores<TData = Awaited<ReturnType<typeof getScores>>, TError = ErrorType<unknown>>(params?: GetScoresParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getScores>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetStandingsUrl: (params: GetStandingsParams) => string;
/**
 * @summary Get league standings
 */
export declare const getStandings: (params: GetStandingsParams, options?: RequestInit) => Promise<Standing[]>;
export declare const getGetStandingsQueryKey: (params?: GetStandingsParams) => readonly ["/api/football/standings", ...GetStandingsParams[]];
export declare const getGetStandingsQueryOptions: <TData = Awaited<ReturnType<typeof getStandings>>, TError = ErrorType<unknown>>(params: GetStandingsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStandings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStandings>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStandingsQueryResult = NonNullable<Awaited<ReturnType<typeof getStandings>>>;
export type GetStandingsQueryError = ErrorType<unknown>;
/**
 * @summary Get league standings
 */
export declare function useGetStandings<TData = Awaited<ReturnType<typeof getStandings>>, TError = ErrorType<unknown>>(params: GetStandingsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStandings>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetTopScorersUrl: (params: GetTopScorersParams) => string;
/**
 * @summary Get top scorers for a league
 */
export declare const getTopScorers: (params: GetTopScorersParams, options?: RequestInit) => Promise<Scorer[]>;
export declare const getGetTopScorersQueryKey: (params?: GetTopScorersParams) => readonly ["/api/football/top-scorers", ...GetTopScorersParams[]];
export declare const getGetTopScorersQueryOptions: <TData = Awaited<ReturnType<typeof getTopScorers>>, TError = ErrorType<unknown>>(params: GetTopScorersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTopScorers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTopScorers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTopScorersQueryResult = NonNullable<Awaited<ReturnType<typeof getTopScorers>>>;
export type GetTopScorersQueryError = ErrorType<unknown>;
/**
 * @summary Get top scorers for a league
 */
export declare function useGetTopScorers<TData = Awaited<ReturnType<typeof getTopScorers>>, TError = ErrorType<unknown>>(params: GetTopScorersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTopScorers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetNewsUrl: () => string;
/**
 * @summary Get latest football news
 */
export declare const getNews: (options?: RequestInit) => Promise<NewsArticle[]>;
export declare const getGetNewsQueryKey: () => readonly ["/api/football/news"];
export declare const getGetNewsQueryOptions: <TData = Awaited<ReturnType<typeof getNews>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNews>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getNews>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetNewsQueryResult = NonNullable<Awaited<ReturnType<typeof getNews>>>;
export type GetNewsQueryError = ErrorType<unknown>;
/**
 * @summary Get latest football news
 */
export declare function useGetNews<TData = Awaited<ReturnType<typeof getNews>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNews>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetTeamUrl: (params: GetTeamParams) => string;
/**
 * @summary Search for a team
 */
export declare const getTeam: (params: GetTeamParams, options?: RequestInit) => Promise<TeamDetail>;
export declare const getGetTeamQueryKey: (params?: GetTeamParams) => readonly ["/api/football/team", ...GetTeamParams[]];
export declare const getGetTeamQueryOptions: <TData = Awaited<ReturnType<typeof getTeam>>, TError = ErrorType<unknown>>(params: GetTeamParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTeam>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTeam>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTeamQueryResult = NonNullable<Awaited<ReturnType<typeof getTeam>>>;
export type GetTeamQueryError = ErrorType<unknown>;
/**
 * @summary Search for a team
 */
export declare function useGetTeam<TData = Awaited<ReturnType<typeof getTeam>>, TError = ErrorType<unknown>>(params: GetTeamParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTeam>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetFixturesUrl: (params: GetFixturesParams) => string;
/**
 * @summary Get upcoming fixtures for a team
 */
export declare const getFixtures: (params: GetFixturesParams, options?: RequestInit) => Promise<Match[]>;
export declare const getGetFixturesQueryKey: (params?: GetFixturesParams) => readonly ["/api/football/fixtures", ...GetFixturesParams[]];
export declare const getGetFixturesQueryOptions: <TData = Awaited<ReturnType<typeof getFixtures>>, TError = ErrorType<unknown>>(params: GetFixturesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFixtures>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFixtures>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFixturesQueryResult = NonNullable<Awaited<ReturnType<typeof getFixtures>>>;
export type GetFixturesQueryError = ErrorType<unknown>;
/**
 * @summary Get upcoming fixtures for a team
 */
export declare function useGetFixtures<TData = Awaited<ReturnType<typeof getFixtures>>, TError = ErrorType<unknown>>(params: GetFixturesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFixtures>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMatchUrl: (id: number) => string;
/**
 * @summary Get full match details
 */
export declare const getMatch: (id: number, options?: RequestInit) => Promise<MatchDetail>;
export declare const getGetMatchQueryKey: (id: number) => readonly [`/api/football/match/${number}`];
export declare const getGetMatchQueryOptions: <TData = Awaited<ReturnType<typeof getMatch>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMatch>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMatch>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMatchQueryResult = NonNullable<Awaited<ReturnType<typeof getMatch>>>;
export type GetMatchQueryError = ErrorType<void>;
/**
 * @summary Get full match details
 */
export declare function useGetMatch<TData = Awaited<ReturnType<typeof getMatch>>, TError = ErrorType<void>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMatch>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMatchH2HUrl: (id: number, params?: GetMatchH2HParams) => string;
/**
 * @summary Get head-to-head stats for a match
 */
export declare const getMatchH2H: (id: number, params?: GetMatchH2HParams, options?: RequestInit) => Promise<H2HResult>;
export declare const getGetMatchH2HQueryKey: (id: number, params?: GetMatchH2HParams) => readonly [`/api/football/match/${number}/h2h`, ...GetMatchH2HParams[]];
export declare const getGetMatchH2HQueryOptions: <TData = Awaited<ReturnType<typeof getMatchH2H>>, TError = ErrorType<unknown>>(id: number, params?: GetMatchH2HParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMatchH2H>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMatchH2H>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMatchH2HQueryResult = NonNullable<Awaited<ReturnType<typeof getMatchH2H>>>;
export type GetMatchH2HQueryError = ErrorType<unknown>;
/**
 * @summary Get head-to-head stats for a match
 */
export declare function useGetMatchH2H<TData = Awaited<ReturnType<typeof getMatchH2H>>, TError = ErrorType<unknown>>(id: number, params?: GetMatchH2HParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMatchH2H>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map