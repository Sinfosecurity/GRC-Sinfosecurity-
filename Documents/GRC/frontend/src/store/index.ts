import { configureStore } from '@reduxjs/toolkit';

// Placeholder reducers - will be implemented in modules
export const store = configureStore({
    reducer: {
        // auth: authReducer,
        // risk: riskReducer,
        // compliance: complianceReducer,
        // etc.
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
