import { renderHook, waitFor } from '@testing-library/react';
import { useBattleData } from '../useBattleData';

// Mock Supabase client
const mockCreateClient = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  createClient: mockCreateClient,
}));

const mockSupabase = {
  from: jest.fn(),
};

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockMaybeSingle = jest.fn();

describe('useBattleData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabase);
    
    // Setup method chaining
    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    });
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useBattleData('test-battle-id'));
    
    expect(result.current.loading).toBe(true);
    expect(result.current.battle).toBe(null);
    expect(result.current.selection).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should fetch battle data successfully', async () => {
    const mockBattle = {
      id: 'test-battle-id',
      challenger_id: 'user1',
      opponent_id: 'user2',
      status: 'active',
      created_at: '2023-01-01T00:00:00Z',
    };

    const mockSelection = {
      id: 'selection-id',
      battle_id: 'test-battle-id',
      player1_id: 'user1',
      player1_card_id: 'card1',
      player2_id: 'user2',
      player2_card_id: null,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    mockSingle.mockResolvedValueOnce({ data: mockBattle, error: null });
    mockMaybeSingle.mockResolvedValueOnce({ data: mockSelection, error: null });

    const { result } = renderHook(() => useBattleData('test-battle-id'));

    // Trigger the refresh function
    await waitFor(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.battle).toEqual(mockBattle);
      expect(result.current.selection).toEqual(mockSelection);
      expect(result.current.error).toBe(null);
    });
  });

  it('should handle battle not found error', async () => {
    mockSingle.mockResolvedValueOnce({ 
      data: null, 
      error: { code: 'PGRST116', message: 'No rows found' } 
    });

    const { result } = renderHook(() => useBattleData('non-existent-battle'));

    await waitFor(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.battle).toBe(null);
      expect(result.current.error).toBe('Battle not found');
    });
  });

  it('should handle database errors', async () => {
    mockSingle.mockResolvedValueOnce({ 
      data: null, 
      error: { message: 'Database connection failed' } 
    });

    const { result } = renderHook(() => useBattleData('test-battle-id'));

    await waitFor(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Failed to fetch battle: Database connection failed');
    });
  });

  it('should handle missing battle ID', async () => {
    const { result } = renderHook(() => useBattleData(''));

    await waitFor(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Battle ID is required');
    });
  });
});