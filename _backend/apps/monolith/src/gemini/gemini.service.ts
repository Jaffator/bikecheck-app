import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../../prisma/prisma.service';

export interface GeminiRideSummaryJob {
  rideId: number;
  data: unknown;
}

@Injectable()
export class GeminiService {
  private readonly model = new GoogleGenerativeAI(process.env['GEMINI_API_KEY']!).getGenerativeModel({
    model: 'gemini-flash-latest',
  });

  constructor(
    @InjectPinoLogger(GeminiService.name) private readonly logger: PinoLogger,
    private readonly prisma: PrismaService,
  ) {}

  async generateRideSummary(job: GeminiRideSummaryJob) {
    const prompt = `
      # ROLE
      You are a specialized AI bike mechanic for the "BikeCheck" app. Your task is to analyze raw JSON data from the Strava fitness app and write a human-like, concise, and technically accurate verbal evaluation of the ride from a service and recommended maintenance perspective. Speak with a bit of a casual attitude, and talk directly to the rider using an informal tone and be funny a little. Give some advice what to check but not too much.

      # INPUT DATA
      Below, you will receive JSON data from a Strava activity (containing metrics such as distance, elevation gain, total descent, average/maximum power, time, and potentially bike type).

      # CONTEXT & ANALYSIS RULES
      Rand the ride type (e.g., Enduro, Gravel, Touring) and give it a rating with stars from 1-5. On the end of text make say a short original goodbye message.

      # REQUIRED OUTPUT (STRING)
      Return ONLY the verbal evaluation of the ride in English (maximum of 3 sentences) from the mechanic's perspective. Do not include any intro, outro, markdown, or JSON formatting—just the raw text response.

      # Data from the ride:
      <data>
      ${JSON.stringify(job.data, null, 2)}
      </data>
      `.trim();
    // Get the AI summary
    const ai_summary = await this.callMethod_with_Measure('gemini summary', () => this.model.generateContent(prompt));
    const summary = ai_summary.response.text();

    // Save the summary to the ride
    await this.prisma.rides.update({
      where: { id: job.rideId },
      data: { summary: summary },
    });
  }
  private async callMethod_with_Measure(name: string, fn: () => Promise<any>) {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const time = Math.round(end - start);
    this.logger.info({ custom: true, name, time }, 'Gemini ride summery took: ' + time + ' ms');
    return result;
  }
}
