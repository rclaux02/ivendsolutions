export interface Product {
  id: string;
  name: string;
  slot_id: string;
  slot_quantity: number;
  price: number;
  description?: string;
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Product 1',
    slot_id: 'A1',
    slot_quantity: 10,
    price: 9.99,
    description: 'Product 1 description'
  },
  {
    id: '2',
    name: 'Product 2',
    slot_id: 'A2',
    slot_quantity: 15,
    price: 14.99,
    description: 'Product 2 description'
  }
]; 