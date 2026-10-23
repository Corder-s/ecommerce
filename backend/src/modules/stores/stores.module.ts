import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { PublicStoresController } from './public-stores.controller';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [StoresController, PublicStoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}
