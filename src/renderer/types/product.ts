export interface Product {
  id: string | number;
  name: string;
  brand: string;
  discount?: string;
  image: string;
  puffs: number;
  price: number;
  slot_id: string;
  slot_quantity: number;
  category: string;
  FS_PORCENTAJE_NICOTINA?: number;
  FS_SABOR?: string;
  FS_DES_PROD?: string;
  FS_DES_PROD_CONT?: string;
  FS_DES_PROD_DETA?: string;
  FS_DIMENSION?: string;
  FS_TIP_CARGA?: string;
} 