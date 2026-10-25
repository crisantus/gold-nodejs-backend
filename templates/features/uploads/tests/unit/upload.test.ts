import { describe, expect, it } from 'vitest';
import { detectAllowedFile } from '../../src/services/upload.service.js';
describe('upload boundaries', () => {
  it('rejects non-files even when a caller claims an image MIME type', async () => { await expect(detectAllowedFile(Buffer.from('this is not an image'))).rejects.toMatchObject({ errorCode: 'FILE_TYPE_INVALID' }); });
  it('rejects truncated signatures as validation errors', async () => { await expect(detectAllowedFile(Buffer.from('89504e470d0a1a0a', 'hex'))).rejects.toMatchObject({ errorCode: 'FILE_TYPE_INVALID' }); });
  it('recognizes a PNG from bytes', async () => { const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP1sAAAAASUVORK5CYII=', 'base64'); expect((await detectAllowedFile(png)).mime).toBe('image/png'); });
});
