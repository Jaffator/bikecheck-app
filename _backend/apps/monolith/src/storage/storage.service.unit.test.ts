import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'stream';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';

// The S3 client is built in the constructor, so the send it makes is what tests stand in
// for - one mock for the whole client, read back per command.
const send = jest.fn();
jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send })),
  };
});

const KEY = 'service-attachments/faktura.pdf';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [StorageService],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload file to R2 storage', async () => {
      // TODO: Implement test with mocked S3 client
    });

    it('should throw error on upload failure', async () => {
      // TODO: Implement test with mocked S3 client error
    });
  });

  describe('uploadBikeImage', () => {
    it('should upload bike image with correct parameters', async () => {
      // TODO: Implement test
    });
  });

  // The read side exists so a Report can serve its own attachments rather than hand out a
  // storage address (ADR 0013).
  describe('downloadFileR2CloudFare', () => {
    it('asks the bucket for the key it was given', async () => {
      send.mockResolvedValue({ Body: Readable.from([Buffer.from('%PDF-1.7')]), ContentLength: 8 });

      await service.downloadFileR2CloudFare(KEY);

      const command = send.mock.calls[0][0] as GetObjectCommand;
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input.Key).toBe(KEY);
    });

    it('hands back the bytes as a stream, with the length when storage reports one', async () => {
      send.mockResolvedValue({ Body: Readable.from([Buffer.from('%PDF-1.7')]), ContentLength: 8 });

      const file = await service.downloadFileR2CloudFare(KEY);

      expect(file.body).toBeInstanceOf(Readable);
      expect(file.contentLength).toBe(8);
    });

    it('reports no length rather than inventing one', async () => {
      send.mockResolvedValue({ Body: Readable.from([Buffer.from('%PDF-1.7')]) });

      const file = await service.downloadFileR2CloudFare(KEY);

      expect(file.contentLength).toBeNull();
    });

    // A key the bucket does not hold is a missing file, not a broken server.
    it('refuses a key that storage answers with no body', async () => {
      send.mockResolvedValue({});

      await expect(service.downloadFileR2CloudFare(KEY)).rejects.toThrow(NotFoundException);
    });

    it('refuses a key the bucket does not hold', async () => {
      send.mockRejectedValue(Object.assign(new Error('missing'), { name: 'NoSuchKey' }));

      await expect(service.downloadFileR2CloudFare(KEY)).rejects.toThrow(NotFoundException);
    });

    // Credentials, network, a bucket that is not there: this server's fault, and saying
    // 404 would send the caller looking in the wrong place.
    it('does not pass a broken server off as a missing file', async () => {
      send.mockRejectedValue(new Error('connection refused'));

      await expect(service.downloadFileR2CloudFare(KEY)).rejects.toThrow(InternalServerErrorException);
    });
  });

  // The inverse of the address the write path builds, so a report can store a key rather
  // than something fetchable on its own.
  describe('storageKeyFromUrl', () => {
    it('takes the key out of an address served from the configured origin', () => {
      process.env.CLOUDFLARE_PUBLIC_URL = 'https://files.bikecheck.cloud';

      expect(service.storageKeyFromUrl(`https://files.bikecheck.cloud/${KEY}`)).toBe(KEY);
    });

    // A file uploaded before the origin changed is still found: the path is the key either way.
    it('falls back to the path when the address came from somewhere else', () => {
      process.env.CLOUDFLARE_PUBLIC_URL = 'https://files.bikecheck.cloud';

      expect(service.storageKeyFromUrl(`https://old-bucket.example.com/${KEY}`)).toBe(KEY);
    });

    it('leaves a bare key alone', () => {
      expect(service.storageKeyFromUrl(KEY)).toBe(KEY);
    });

    // Rather than silently storing the whole address as the key, which would 404 later.
    it('still finds the key with no origin configured', () => {
      delete process.env.CLOUDFLARE_PUBLIC_URL;

      expect(service.storageKeyFromUrl(`https://files.bikecheck.cloud/${KEY}`)).toBe(KEY);
    });
  });

  // S3Client is mocked at the module level; keeping the real one out of these tests is the
  // point, so nothing here should have reached the network.
  it('never builds a real S3 client in tests', () => {
    expect(jest.isMockFunction(S3Client)).toBe(true);
  });
});
