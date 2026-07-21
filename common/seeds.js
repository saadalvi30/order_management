require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("./db");
const ROLES = require("./constants/role");
const PRODUCT_STATUS = require("./constants/productStatus");

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
const DEFAULT_PASSWORD = "Passw0rd@123";

async function seedUsers() {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  const users = [
    { name: "Admin User", email: "admin@test.com", role: ROLES.ADMIN },
    { name: "Staff One", email: "staff1@test.com", role: ROLES.STAFF },
    { name: "Staff Two", email: "staff2@test.com", role: ROLES.STAFF },
    { name: "Customer One", email: "customer1@test.com", role: ROLES.CUSTOMER },
    { name: "Customer Two", email: "customer2@test.com", role: ROLES.CUSTOMER },
    { name: "Customer Three", email: "customer3@test.com", role: ROLES.CUSTOMER },
  ];

  for (const user of users) {
    await db.query(
      `INSERT INTO users (name, email, password, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [user.name, user.email, hashedPassword, user.role]
    );
  }

  console.log("Users seeded.");
  return users;
}

async function seedProducts() {
  const products = [
    { name: "Wireless Mouse", productCode: "PROD-101", price: 25.99, availableQty: 100, minStockLevel: 10 },
    { name: "Mechanical Keyboard", productCode: "PROD-102", price: 79.99, availableQty: 50, minStockLevel: 5 },
    { name: "USB-C Cable", productCode: "PROD-103", price: 9.99, availableQty: 200, minStockLevel: 20 },
    { name: "Laptop Stand", productCode: "PROD-104", price: 34.5, availableQty: 8, minStockLevel: 10 }, // low stock on purpose
    { name: "27-inch Monitor", productCode: "PROD-105", price: 249.99, availableQty: 15, minStockLevel: 3 },
    { name: "Webcam HD", productCode: "PROD-106", price: 45.0, availableQty: 30, minStockLevel: 5 },
    { name: "Desk Lamp", productCode: "PROD-107", price: 19.99, availableQty: 4, minStockLevel: 10 }, // low stock
    { name: "Noise Cancelling Headphones", productCode: "PROD-108", price: 129.99, availableQty: 25, minStockLevel: 5 },
    { name: "Bluetooth Speaker", productCode: "PROD-109", price: 39.99, availableQty: 60, minStockLevel: 10 },
    { name: "External SSD 1TB", productCode: "PROD-110", price: 89.99, availableQty: 40, minStockLevel: 8 },
  ];

  for (const product of products) { 
    await db.query(
      `INSERT INTO products (name, productcode, price, availableqty, minstocklevel, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (productcode) DO NOTHING`,
      [product.name, product.productCode, product.price, product.availableQty, product.minStockLevel, PRODUCT_STATUS.ACTIVE]
    );
  }

  console.log("Products seeded.");
  return products;
}

async function seed() {
  const users = await seedUsers();
  const products = await seedProducts();

  console.log("\nSeed completed!");
  console.log(`Default password for all seeded users: ${DEFAULT_PASSWORD}\n`);

  console.table(users.map((u) => ({ name: u.name, email: u.email, role: u.role })));
  console.table(products.map((p) => ({ code: p.productCode, name: p.name, qty: p.availableQty })));

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});