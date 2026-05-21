import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { IsNotEmpty, IsString } from 'class-validator';

export class TestDto {
  @IsString()
  @IsNotEmpty({ message: 'Name should not be empty' })
  name!: string;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('test-validation')
  testValidation(@Body() body: TestDto) {
    return { success: true, data: body };
  }
}
