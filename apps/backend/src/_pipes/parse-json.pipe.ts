import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseJsonPipe implements PipeTransform {
  transform(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      throw new BadRequestException('Invalid JSON in data field');
    }
  }
}
