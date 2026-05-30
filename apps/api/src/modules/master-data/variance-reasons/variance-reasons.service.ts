import { Injectable } from '@nestjs/common';

@Injectable()
export class VarianceReasonsService {
  private readonly varianceReasons = [
    {
      id: '1',
      code: 'THEFT',
      name_en: 'Theft / Loss',
      name_ar: 'سرقة / فقدان',
      is_active: true,
    },
    {
      id: '2',
      code: 'DAMAGE',
      name_en: 'Damage',
      name_ar: 'تلف',
      is_active: true,
    },
    {
      id: '3',
      code: 'SPOILAGE',
      name_en: 'Spoilage',
      name_ar: 'فساد الأغذية',
      is_active: true,
    },
    {
      id: '4',
      code: 'CORRECTION',
      name_en: 'Inventory Correction',
      name_ar: 'تصحيح جرد',
      is_active: true,
    },
    {
      id: '5',
      code: 'ADMIN_OVERRIDE',
      name_en: 'Admin Override',
      name_ar: 'تجاوز إداري',
      is_active: true,
    },
  ];

  findAll() {
    return this.varianceReasons;
  }
}
