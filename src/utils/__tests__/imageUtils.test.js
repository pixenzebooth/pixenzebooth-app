import { describe, it, expect } from 'vitest';
import { getFilterCss } from '../imageUtils';

describe('imageUtils', () => {
    describe('getFilterCss', () => {
        it('should return correct CSS for "bright"', () => {
            expect(getFilterCss('bright')).toBe('brightness(1.2) contrast(1.1)');
        });

        it('should return correct CSS for "vintage"', () => {
            expect(getFilterCss('vintage')).toBe('sepia(0.4) contrast(1.2)');
        });

        it('should return "none" for unknown filter', () => {
            expect(getFilterCss('unknown')).toBe('none');
        });

        it('should return "none" for "none"', () => {
            expect(getFilterCss('none')).toBe('none');
        });
    });
});
