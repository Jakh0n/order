// Demo store data used by the seed. Money in minor units (USD cents).

type Option = [name: string, priceCents: number];
interface Group {
  name: string;
  required: boolean;
  maxSelect: number;
  options: Option[];
}
export interface MenuItem {
  name: string;
  price: number;
  description: string;
  groups?: Group[];
}

const SAUCES: Option[] = [
  ["Garlic", 0],
  ["Spicy", 0],
  ["BBQ", 0],
];

export const FLAMI_MENU: { category: string; items: MenuItem[] }[] = [
  {
    category: "Doner & Wraps",
    items: [
      {
        name: "Chicken Doner Wrap",
        price: 899,
        description:
          "Juicy chicken doner in a thin lavash with tomato, cucumber, red onion and our signature garlic sauce.",
        groups: [
          {
            name: "Size",
            required: true,
            maxSelect: 1,
            options: [
              ["Regular", 0],
              ["Large", 200],
            ],
          },
          {
            name: "Extras",
            required: false,
            maxSelect: 3,
            options: [
              ["Cheese", 100],
              ["Jalapeños", 50],
              ["Extra meat", 250],
            ],
          },
        ],
      },
      {
        name: "Çöp Shish Wrap",
        price: 999,
        description:
          "Charcoal-grilled bite-size chicken skewers, fresh herbs and red onion wrapped in warm lavash.",
        groups: [{ name: "Sauce", required: true, maxSelect: 1, options: SAUCES }],
      },
      {
        name: "Falafel Wrap",
        price: 799,
        description:
          "Crispy chickpea falafel, tzatziki, cabbage and fresh herbs. Meat-free and filling.",
        groups: [
          {
            name: "Extras",
            required: false,
            maxSelect: 2,
            options: [
              ["Cheese", 100],
              ["Hummus", 150],
            ],
          },
        ],
      },
      {
        name: "Doner Burger",
        price: 949,
        description: "Beef doner in a soft bun with crisp lettuce, tomato and sauce.",
      },
    ],
  },
  {
    category: "Combos",
    items: [
      {
        name: "Doner Combo",
        price: 1299,
        description: "Doner wrap, fries, two sauces and a drink — our bestseller.",
        groups: [
          {
            name: "Drink",
            required: true,
            maxSelect: 1,
            options: [
              ["Ayran", 0],
              ["Cola", 0],
              ["Lemonade", 100],
            ],
          },
        ],
      },
    ],
  },
  {
    category: "Grill & Plates",
    items: [
      {
        name: "Chicken Shish Plate",
        price: 1499,
        description:
          "Three chicken skewers with your choice of side, fresh salad, sauce and warm lavash.",
        groups: [
          {
            name: "Side",
            required: true,
            maxSelect: 1,
            options: [
              ["Rice", 0],
              ["Fries", 0],
              ["Bulgur", 0],
            ],
          },
        ],
      },
      {
        name: "Sac Tava",
        price: 1599,
        description:
          "Sizzling chicken pieces with colourful peppers and tomato, served in a hot pan.",
      },
      {
        name: "Grilled Beef Steak",
        price: 2299,
        description: "Charcoal-grilled beef steak with roast potatoes and pepper sauce.",
        groups: [
          {
            name: "Doneness",
            required: true,
            maxSelect: 1,
            options: [
              ["Medium", 0],
              ["Medium well", 0],
              ["Well done", 0],
            ],
          },
        ],
      },
    ],
  },
  {
    category: "Sides & Sauces",
    items: [
      {
        name: "Fries",
        price: 399,
        description: "Golden, crispy fries with sea salt.",
        groups: [
          {
            name: "Size",
            required: true,
            maxSelect: 1,
            options: [
              ["Small", 0],
              ["Large", 150],
            ],
          },
        ],
      },
      {
        name: "Hummus",
        price: 499,
        description: "Silky chickpea purée with olive oil, served with lavash.",
      },
      {
        name: "Extra Sauce",
        price: 99,
        description: "An extra pot of sauce for your doner or fries.",
        groups: [{ name: "Sauce", required: true, maxSelect: 1, options: SAUCES }],
      },
    ],
  },
  {
    category: "Drinks",
    items: [
      {
        name: "Ayran",
        price: 249,
        description: "Chilled, frothy yogurt drink — the classic kebab pairing.",
      },
      {
        name: "Homemade Lemonade",
        price: 399,
        description: "Fresh lemon, mint and lots of ice.",
        groups: [
          {
            name: "Flavor",
            required: true,
            maxSelect: 1,
            options: [
              ["Classic", 0],
              ["Strawberry", 50],
              ["Mango", 50],
            ],
          },
        ],
      },
      { name: "Cola 0.5 L", price: 249, description: "Ice-cold soft drink." },
    ],
  },
  {
    category: "Desserts",
    items: [
      {
        name: "Pistachio Baklava (4 pcs)",
        price: 699,
        description: "Turkish pistachio baklava with honey syrup.",
      },
      {
        name: "Künefe",
        price: 799,
        description: "Warm künefe: shredded kadayıf pastry, melted cheese and sweet syrup.",
      },
    ],
  },
];

/** Flat delivery fee in cents */
export const FLAMI_DELIVERY_FEE = 299;
