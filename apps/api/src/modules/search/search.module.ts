import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/database.module';
import { SearchController } from './search.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
})
export class SearchModule {}
