import { ValidationPipe } from '@nestjs/common';
import { CreateSupplierDto } from './src/modules/master-data/suppliers/dto/supplier.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
});

const payload = {
  name: 'Test',
  contactEmail: null,
  contactPhone: null,
  contactName: null,
  isActive: true,
};

pipe.transform(payload, { type: 'body', metatype: CreateSupplierDto })
  .then(res => {
    console.log('SUCCESS:', res);
  })
  .catch(err => {
    console.log('ERROR:', err.getResponse());
  });
