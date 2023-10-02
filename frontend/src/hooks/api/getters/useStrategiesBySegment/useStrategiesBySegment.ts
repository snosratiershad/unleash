import { mutate } from 'swr';
import { useCallback } from 'react';
import { formatApiPath } from 'utils/formatPath';
import handleErrorResponses from '../httpErrorResponseHandler';
import { IFeatureStrategy } from 'interfaces/strategy';
import { useConditionalSWR } from '../useConditionalSWR/useConditionalSWR';

export interface IUseStrategiesBySegmentOutput {
    strategies: IFeatureStrategy[];
    refetchUsedSegments: () => void;
    loading: boolean;
    error?: Error;
}

export const useStrategiesBySegment = (
    id?: string | number,
): IUseStrategiesBySegmentOutput => {
    const path = formatApiPath(`api/admin/segments/${id}/strategies`);
    const { data, error } = useConditionalSWR(id, [], path, () =>
        fetchUsedSegment(path),
    );

    const refetchUsedSegments = useCallback(() => {
        mutate(path).catch(console.warn);
    }, [path]);

    return {
        strategies: data?.strategies || [],
        refetchUsedSegments,
        loading: !error && !data,
        error,
    };
};

const fetchUsedSegment = (path: string) => {
    return fetch(path, { method: 'GET' })
        .then(handleErrorResponses('Strategies by segment'))
        .then((res) => res.json());
};
