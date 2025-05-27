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
  FS_PORCENTAJE_NICOTINA?: number;
  FS_SABOR?: string;
} 