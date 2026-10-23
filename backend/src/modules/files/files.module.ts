import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FilesRepository } from './files.repository';
import { FileImageValidator } from './validators/file-image.validator';
import { ObjectStorageModule } from '../../integrations/object-storage';

@Module({
  imports: [ObjectStorageModule],
  controllers: [FilesController],
  providers: [FilesService, FilesRepository, FileImageValidator],
  exports: [FilesService, FilesRepository],
})
export class FilesModule {}
