import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailProviderModule } from '../../integrations/email-provider';
import { NotificationsModule } from '../notifications/notifications.module';
import { JobProducer } from './producers/job.producer';
import { JobProcessor } from './processors/job.processor';

@Module({
  imports: [PrismaModule, EmailProviderModule, forwardRef(() => NotificationsModule)],
  providers: [JobProducer, JobProcessor],
  exports: [JobProducer, JobProcessor],
})
export class JobsModule {}
