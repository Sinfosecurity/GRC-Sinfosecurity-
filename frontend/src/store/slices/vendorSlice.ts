import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { vendorAPI } from '../../services/api';

interface Vendor {
    id: number;
    name: string;
    category: string;
    tier: 'Critical' | 'High' | 'Medium' | 'Low';
    status: string;
    riskScore: number;
    complianceScore: number;
    lastAssessment: string;
    nextReview: string;
    contactEmail: string;
    dataAccess: string;
    assessmentStatus: 'Not Started' | 'In Progress' | 'Completed' | 'Overdue';
}

interface VendorStatistics {
    totalVendors: number;
    criticalVendors: number;
    overdueAssessments: number;
    averageRiskScore: number;
    tierDistribution: {
        Critical: number;
        High: number;
        Medium: number;
        Low: number;
    };
}

interface VendorState {
    vendors: Vendor[];
    selectedVendor: Vendor | null;
    statistics: VendorStatistics | null;
    isLoading: boolean;
    error: string | null;
    filters: {
        tier?: string;
        status?: string;
        category?: string;
    };
}

const initialState: VendorState = {
    vendors: [],
    selectedVendor: null,
    statistics: null,
    isLoading: false,
    error: null,
    filters: {},
};

// Async thunks
export const fetchVendors = createAsyncThunk(
    'vendor/fetchVendors',
    async (_, { rejectWithValue }) => {
        try {
            const response = await vendorAPI.getAll();
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch vendors');
        }
    }
);

export const fetchVendorById = createAsyncThunk(
    'vendor/fetchVendorById',
    async (id: number, { rejectWithValue }) => {
        try {
            const response = await vendorAPI.getById(id.toString());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch vendor');
        }
    }
);

export const createVendor = createAsyncThunk(
    'vendor/createVendor',
    async (vendorData: Partial<Vendor>, { rejectWithValue }) => {
        try {
            const response = await vendorAPI.create(vendorData);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create vendor');
        }
    }
);

export const updateVendor = createAsyncThunk(
    'vendor/updateVendor',
    async ({ id, data }: { id: number; data: Partial<Vendor> }, { rejectWithValue }) => {
        try {
            const response = await vendorAPI.update(id.toString(), data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update vendor');
        }
    }
);

export const deleteVendor = createAsyncThunk(
    'vendor/deleteVendor',
    async (id: number, { rejectWithValue }) => {
        try {
            await vendorAPI.delete(id.toString());
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete vendor');
        }
    }
);

export const fetchVendorStatistics = createAsyncThunk(
    'vendor/fetchStatistics',
    async (_, { rejectWithValue }) => {
        try {
            const response = await vendorAPI.getStatistics();
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch statistics');
        }
    }
);

const vendorSlice = createSlice({
    name: 'vendor',
    initialState,
    reducers: {
        setSelectedVendor: (state, action: PayloadAction<Vendor | null>) => {
            state.selectedVendor = action.payload;
        },
        setFilters: (state, action: PayloadAction<VendorState['filters']>) => {
            state.filters = action.payload;
        },
        clearFilters: (state) => {
            state.filters = {};
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch vendors
        builder
            .addCase(fetchVendors.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchVendors.fulfilled, (state, action) => {
                state.isLoading = false;
                state.vendors = action.payload;
            })
            .addCase(fetchVendors.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Fetch vendor by ID
        builder
            .addCase(fetchVendorById.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchVendorById.fulfilled, (state, action) => {
                state.isLoading = false;
                state.selectedVendor = action.payload;
            })
            .addCase(fetchVendorById.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Create vendor
        builder
            .addCase(createVendor.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createVendor.fulfilled, (state, action) => {
                state.isLoading = false;
                state.vendors.push(action.payload);
            })
            .addCase(createVendor.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Update vendor
        builder
            .addCase(updateVendor.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateVendor.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.vendors.findIndex((v) => v.id === action.payload.id);
                if (index !== -1) {
                    state.vendors[index] = action.payload;
                }
                if (state.selectedVendor?.id === action.payload.id) {
                    state.selectedVendor = action.payload;
                }
            })
            .addCase(updateVendor.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Delete vendor
        builder
            .addCase(deleteVendor.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deleteVendor.fulfilled, (state, action) => {
                state.isLoading = false;
                state.vendors = state.vendors.filter((v) => v.id !== action.payload);
                if (state.selectedVendor?.id === action.payload) {
                    state.selectedVendor = null;
                }
            })
            .addCase(deleteVendor.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });

        // Fetch statistics
        builder
            .addCase(fetchVendorStatistics.pending, (state) => {
                state.error = null;
            })
            .addCase(fetchVendorStatistics.fulfilled, (state, action) => {
                state.statistics = action.payload;
            })
            .addCase(fetchVendorStatistics.rejected, (state, action) => {
                state.error = action.payload as string;
            });
    },
});

export const { setSelectedVendor, setFilters, clearFilters, clearError } = vendorSlice.actions;
export default vendorSlice.reducer;
