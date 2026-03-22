import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('concatenates classes correctly', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-2', 'px-4')).toBe('py-2 px-4');
    expect(cn('p-2 p-4')).toBe('p-4');
  });

  it('handles conditional classes', () => {
    expect(cn('btn', true && 'btn-active', false && 'btn-disabled')).toBe('btn btn-active');
    expect(cn({ 'btn-active': true, 'btn-disabled': false })).toBe('btn-active');
  });

  it('handles arrays of classes', () => {
    expect(cn(['btn', 'btn-primary'], 'p-4')).toBe('btn btn-primary p-4');
  });

  it('handles falsy values', () => {
    expect(cn('btn', null, undefined, false, '')).toBe('btn');
  });

  it('handles nested arrays and objects', () => {
    expect(cn(['btn', { 'btn-primary': true, 'btn-large': false }], 'p-4')).toBe('btn btn-primary p-4');
  });
});
