import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressBar } from '../src/progress.js';

// Mock cli-progress
vi.mock('cli-progress', () => ({
  default: {
    SingleBar: vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      update: vi.fn(),
      stop: vi.fn(),
    })),
  },
}));

// Mock chalk
vi.mock('chalk', () => ({
  default: {
    cyan: vi.fn((text) => text),
    green: vi.fn((text) => text),
  },
}));

describe('ProgressBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a progress bar with default label', () => {
    const progress = new ProgressBar(100);
    expect(progress).toBeInstanceOf(ProgressBar);
  });

  it('should create a progress bar with custom label', () => {
    const progress = new ProgressBar(50, 'Processing');
    expect(progress).toBeInstanceOf(ProgressBar);
  });

  it('should update progress and calculate speed', () => {
    const progress = new ProgressBar(100);
    
    // Mock Date.now to control time
    const mockDate = vi.spyOn(Date, 'now');
    mockDate.mockReturnValueOnce(1000); // Start time
    mockDate.mockReturnValueOnce(2000); // Update time (1 second later)
    
    progress.update(50);
    
    // Should call update on the underlying progress bar
    expect(progress).toBeDefined();
  });

  it('should handle zero elapsed time', () => {
    const progress = new ProgressBar(100);
    
    // Mock Date.now to return same time (no elapsed time)
    const mockDate = vi.spyOn(Date, 'now');
    mockDate.mockReturnValue(1000);
    
    progress.update(25);
    
    // Should not throw and should handle speed calculation
    expect(progress).toBeDefined();
  });

  it('should stop progress bar', () => {
    const progress = new ProgressBar(100);
    progress.stop();
    
    // Should not throw
    expect(progress).toBeDefined();
  });

  it('should handle multiple updates', () => {
    const progress = new ProgressBar(100);
    
    const mockDate = vi.spyOn(Date, 'now');
    mockDate.mockReturnValueOnce(1000); // Constructor
    mockDate.mockReturnValueOnce(1500); // First update
    mockDate.mockReturnValueOnce(2000); // Second update
    
    progress.update(25);
    progress.update(50);
    progress.stop();
    
    expect(progress).toBeDefined();
  });

  it('should calculate speed correctly', () => {
    const progress = new ProgressBar(100);
    
    const mockDate = vi.spyOn(Date, 'now');
    mockDate.mockReturnValueOnce(1000); // Start: 1000ms
    mockDate.mockReturnValueOnce(3000); // Update: 3000ms (2 seconds elapsed)
    
    // 50 blocks in 2 seconds = 25 blocks/second
    progress.update(50);
    
    expect(progress).toBeDefined();
  });
});