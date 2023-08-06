import { Controller, Get, Query } from '@nestjs/common';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private appService: AppService) {}
  @Get('ask')
  async chat(
    @Query('question') question: string,
  ): Promise<{ text: string; source: string }> {
    return this.appService.askQuestion(question);
  }
}
