import dummyVapeImage from './dummyVapeImage.png'

export interface Product {
  name: string;
  brand: string;
  discount?: string;
  image: string;
  puffs: number;
  price: number;
  slot_id: string;
  slot_quantity: number;
}

// export const products: Product[] = [
//   // Row 1
//   {
//     name: "Ice King 40,000 Puffs",
//     brand: "Elfbar",
//     discount: "-15%",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "11",
//     slot_quantity: 5
//   },
//   {
//     name: "Melon Fire 30,000 Puffs",
//     brand: "Life Pod",
//     discount: "-15%",
//     image: dummyVapeImage,
//     puffs: 30000,
//     price: 99,
//     slot_id: "22",
//     slot_quantity: 7
//   },
//   {
//     name: "Eco II 50,000 Puffs",
//     brand: "Life Pod",
//     discount: "-15%",
//     image: dummyVapeImage,
//     puffs: 50000,
//     price: 149,
//     slot_id: "13",
//     slot_quantity: 3
//   },
//   {
//     name: "Melon Fire 30,000 Puffs",
//     brand: "Life Pod",
//     discount: "-15%",
//     image: dummyVapeImage,
//     puffs: 30000,
//     price: 99,
//     slot_id: "32",
//     slot_quantity: 4
//   },
//   {
//     name: "Eco II 50,000 Puffs",
//     brand: "Life Pod",
//     discount: "-15%",
//     image: dummyVapeImage,
//     puffs: 50000,
//     price: 149,
//     slot_id: "44",
//     slot_quantity: 6
//   },
//   // Row 2
//   {
//     name: "Ice King 40,000 Puffs",
//     brand: "Elfbar",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "31",
//     slot_quantity: 4
//   },
//   {
//     name: "Ice King 40,000 Puffs",
//     brand: "Elfbar",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "14",
//     slot_quantity: 3
//   },
//   {
//     name: "Ice King 40,000 Puffs",
//     brand: "Elfbar",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "33",
//     slot_quantity: 5
//   },
//   {
//     name: "Ice King 40,000 Puffs",
//     brand: "Elfbar",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "24",
//     slot_quantity: 6
//   },
//   {
//     name: "Ice King 40,000 Puffs",
//     brand: "Elfbar",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "52",
//     slot_quantity: 4
//   },
//   // Row 3
//   {
//     name: "Crystal Plus 25,000 Puffs",
//     brand: "VaporTech",
//     discount: "-20%",
//     image: dummyVapeImage,
//     puffs: 25000,
//     price: 89,
//     slot_id: "15",
//     slot_quantity: 7
//   },
//   {
//     name: "Arctic Blast 35,000 Puffs",
//     brand: "FrostVape",
//     image: dummyVapeImage,
//     puffs: 35000,
//     price: 119,
//     slot_id: "45",
//     slot_quantity: 3
//   },
//   {
//     name: "Fruit Mix 45,000 Puffs",
//     brand: "VaporTech",
//     discount: "-10%",
//     image: dummyVapeImage,
//     puffs: 45000,
//     price: 139,
//     slot_id: "35",
//     slot_quantity: 4
//   },
//   {
//     name: "Cloud Master 30,000 Puffs",
//     brand: "CloudKing",
//     image: dummyVapeImage,
//     puffs: 30000,
//     price: 99,
//     slot_id: "53",
//     slot_quantity: 6
//   },
//   {
//     name: "Berry Blast 40,000 Puffs",
//     brand: "FrostVape",
//     discount: "-15%",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "21",
//     slot_quantity: 4
//   },
//   // Row 4
//   {
//     name: "Mango Tango 35,000 Puffs",
//     brand: "TropicalVape",
//     image: dummyVapeImage,
//     puffs: 35000,
//     price: 119,
//     slot_id: "41",
//     slot_quantity: 5
//   },
//   {
//     name: "Ice Storm 50,000 Puffs",
//     brand: "CloudKing",
//     discount: "-25%",
//     image: dummyVapeImage,
//     puffs: 50000,
//     price: 149,
//     slot_id: "23",
//     slot_quantity: 3
//   },
//   {
//     name: "Strawberry Dream 30,000 Puffs",
//     brand: "TropicalVape",
//     image: dummyVapeImage,
//     puffs: 30000,
//     price: 99,
//     slot_id: "42",
//     slot_quantity: 5
//   },
//   {
//     name: "Arctic Fox 45,000 Puffs",
//     brand: "FrostVape",
//     discount: "-15%",
//     image: dummyVapeImage,
//     puffs: 45000,
//     price: 139,
//     slot_id: "54",
//     slot_quantity: 2
//   },
//   {
//     name: "Mint Breeze 40,000 Puffs",
//     brand: "VaporTech",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "63",
//     slot_quantity: 6
//   },
//   // Row 5
//   {
//     name: "Dragon Fruit 35,000 Puffs",
//     brand: "TropicalVape",
//     discount: "-20%",
//     image: dummyVapeImage,
//     puffs: 35000,
//     price: 119,
//     slot_id: "72",
//     slot_quantity: 3
//   },
//   {
//     name: "Cool Rush 45,000 Puffs",
//     brand: "CloudKing",
//     image: dummyVapeImage,
//     puffs: 45000,
//     price: 139,
//     slot_id: "81",
//     slot_quantity: 4
//   },
//   {
//     name: "Grape Freeze 30,000 Puffs",
//     brand: "FrostVape",
//     image: dummyVapeImage,
//     puffs: 30000,
//     price: 99,
//     slot_id: "93",
//     slot_quantity: 2
//   },
//   {
//     name: "Watermelon Ice 40,000 Puffs",
//     brand: "TropicalVape",
//     discount: "-15%",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "101",
//     slot_quantity: 5
//   },
//   {
//     name: "Blue Razz 35,000 Puffs",
//     brand: "VaporTech",
//     image: dummyVapeImage,
//     puffs: 35000,
//     price: 119,
//     slot_id: "110",
//     slot_quantity: 4
//   },
//   // Row 6
//   {
//     name: "Lemon Drop 40,000 Puffs",
//     brand: "CloudKing",
//     discount: "-10%",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "43",
//     slot_quantity: 3
//   },
//   {
//     name: "Peach Ice 35,000 Puffs",
//     brand: "TropicalVape",
//     image: dummyVapeImage,
//     puffs: 35000,
//     price: 119,
//     slot_id: "64",
//     slot_quantity: 5
//   },
//   {
//     name: "Cherry Pop 45,000 Puffs",
//     brand: "VaporTech",
//     discount: "-20%",
//     image: dummyVapeImage,
//     puffs: 45000,
//     price: 139,
//     slot_id: "75",
//     slot_quantity: 4
//   },
//   {
//     name: "Cool Mint 50,000 Puffs",
//     brand: "FrostVape",
//     image: dummyVapeImage,
//     puffs: 50000,
//     price: 149,
//     slot_id: "85",
//     slot_quantity: 6
//   },
//   {
//     name: "Rainbow Candy 40,000 Puffs",
//     brand: "CloudKing",
//     discount: "-15%",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "95",
//     slot_quantity: 3
//   },
//   // Row 7
//   {
//     name: "Pineapple Express 35,000 Puffs",
//     brand: "TropicalVape",
//     image: dummyVapeImage,
//     puffs: 35000,
//     price: 119,
//     slot_id: "105",
//     slot_quantity: 4
//   },
//   {
//     name: "Blueberry Ice 40,000 Puffs",
//     brand: "FrostVape",
//     discount: "-20%",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "55",
//     slot_quantity: 2
//   },
//   {
//     name: "Cotton Candy 45,000 Puffs",
//     brand: "CloudKing",
//     image: dummyVapeImage,
//     puffs: 45000,
//     price: 139,
//     slot_id: "65",
//     slot_quantity: 5
//   },
//   {
//     name: "Kiwi Passion 30,000 Puffs",
//     brand: "TropicalVape",
//     discount: "-15%",
//     image: dummyVapeImage,
//     puffs: 30000,
//     price: 99,
//     slot_id: "73",
//     slot_quantity: 4
//   },
//   {
//     name: "Energy Blast 50,000 Puffs",
//     brand: "VaporTech",
//     image: dummyVapeImage,
//     puffs: 50000,
//     price: 149,
//     slot_id: "83",
//     slot_quantity: 3
//   },
//   // Row 8
//   {
//     name: "Mixed Berry 40,000 Puffs",
//     brand: "CloudKing",
//     discount: "-25%",
//     image: dummyVapeImage,
//     puffs: 40000,
//     price: 129,
//     slot_id: "87",
//     slot_quantity: 4
//   },
//   {
//     name: "Tropical Punch 35,000 Puffs",
//     brand: "TropicalVape",
//     image: dummyVapeImage,
//     puffs: 35000,
//     price: 119,
//     slot_id: "97",
//     slot_quantity: 5
//   },
//   {
//     name: "Frost Bite 45,000 Puffs",
//     brand: "FrostVape",
//     discount: "-20%",
//     image: dummyVapeImage,
//     puffs: 45000,
//     price: 139,
//     slot_id: "107",
//     slot_quantity: 3
//   }
// ] as const; 