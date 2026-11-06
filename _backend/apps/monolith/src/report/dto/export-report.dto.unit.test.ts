import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExportReportDto } from './export-report.dto';

const refusedFields = async (body: Record<string, unknown>): Promise<string[]> => {
  const errors = await validate(plainToInstance(ExportReportDto, body));

  return errors.map((error) => error.property);
};

const BIKE_BODY = { kind: 'BIKE', bike_id: 15, include_components: true, include_history: true };

describe('ExportReportDto', () => {
  it('takes a Bike Report with its two switches answered', async () => {
    expect(await refusedFields(BIKE_BODY)).toEqual([]);
  });

  it('takes a Service Report by its Service alone', async () => {
    expect(await refusedFields({ kind: 'SERVICE', service_id: 42 })).toEqual([]);
  });

  it.each(['include_components', 'include_history'])('refuses a Bike Report without %s', async (field) => {
    expect(await refusedFields({ ...BIKE_BODY, [field]: undefined })).toEqual([field]);
  });

  // Their frozen Reports still read, but a new export never makes one.
  it.each(['PERIOD', 'BIKECHECK'])('refuses to make a new %s', async (kind) => {
    expect(await refusedFields({ ...BIKE_BODY, kind })).toContain('kind');
  });
});
