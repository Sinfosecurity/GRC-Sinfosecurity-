const inflight = new Map<string, Promise<unknown>>();

export function loadHomeSlice<T>(key: string, work: () => Promise<T>): Promise<T> {
    const existing = inflight.get(key);
    if (existing) return existing as Promise<T>;
    const next = work().finally(() => {
        if (inflight.get(key) === next) inflight.delete(key);
    });
    inflight.set(key, next);
    return next;
}

export function resetHomeDashboardLoads() {
    inflight.clear();
}
