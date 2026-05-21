import type { UseQueryResult } from '@tanstack/react-query';

type QueryLike = Pick<UseQueryResult<unknown>, 'isPending' | 'isFetching' | 'data'>;

export const isQueryRefetching = (query: QueryLike) => query.isFetching && !query.isPending;

export const mergeQueryState = (...queries: QueryLike[]) => ({
  isPending: queries.some((query) => query.isPending),
  isRefetching: queries.some((query) => isQueryRefetching(query)),
});
