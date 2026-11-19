import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecordsModule } from '../records/records.module';
import { StudioService } from './services/studio.service';
import { StudioFieldsController } from './controllers/studio-fields.controller';
import { StudioValuesController } from './controllers/studio-values.controller';
import { StudioSchemaController } from './controllers/studio-schema.controller';
import { CustomField, CustomFieldSchema } from './schemas/custom-field.entity';
import {
  CustomFieldValue,
  CustomFieldValueSchema,
} from './schemas/custom-field-value.entity';

/** Application « Studio » : champs personnalisés sur les fiches. */
@Module({
  imports: [
    RecordsModule,
    MongooseModule.forFeature([
      { name: CustomField.name, schema: CustomFieldSchema },
      { name: CustomFieldValue.name, schema: CustomFieldValueSchema },
    ]),
  ],
  controllers: [
    StudioFieldsController,
    StudioValuesController,
    StudioSchemaController,
  ],
  providers: [StudioService],
  exports: [StudioService],
})
export class StudioModule {}
