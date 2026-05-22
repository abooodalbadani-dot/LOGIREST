import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { IsNotEmpty, IsString } from 'class-validator';
import { Public } from './auth/decorators/public.decorator';

export class TestDto {
  @IsString()
  @IsNotEmpty({ message: 'Name should not be empty' })
  name!: string;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Post('test-validation')
  testValidation(@Body() body: TestDto) {
    return { success: true, data: body };
  }
}
