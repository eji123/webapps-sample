-- ============================================================================
-- FreshMart Online Grocery Store - Database Schema (MySQL / MariaDB)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS freshmart;
USE freshmart;

-- 1. Grocery Products Table
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL,
  unit VARCHAR(80) DEFAULT '1 Pack',
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL DEFAULT 25,
  badge VARCHAR(50) DEFAULT 'Fresh',
  image_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customer Grocery Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  delivery_address TEXT NOT NULL,
  items_summary TEXT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Seed All 12 Grocery Items (Pointing to assets/images/*.svg)
INSERT INTO products (name, category, unit, price, stock, badge, image_url) VALUES
('Organic Hass Avocados', 'Fruits & Vegetables', 'Pack of 4 (approx. 700g)', 5.49, 45, 'Organic', 'assets/images/avocados.svg'),
('Sweet Cavendish Bananas', 'Fruits & Vegetables', '1 kg Bunch', 1.99, 80, 'Best Seller', 'assets/images/bananas.svg'),
('Fresh Strawberries', 'Fruits & Vegetables', '250g Punnet', 4.25, 35, 'Farm Fresh', 'assets/images/strawberries.svg'),
('Organic Baby Spinach', 'Fruits & Vegetables', '200g Washed Bag', 2.89, 50, 'Organic', 'assets/images/spinach.svg'),
('Pasture-Raised Brown Eggs', 'Dairy & Eggs', 'Dozen (12 Large Eggs)', 4.79, 60, 'Free Range', 'assets/images/eggs.svg'),
('Fresh Whole Cow Milk', 'Dairy & Eggs', '1 Liter Bottle', 2.49, 65, 'Daily Fresh', 'assets/images/milk.svg'),
('Artisan Sourdough Loaf', 'Bakery', '650g Freshly Baked', 4.99, 22, 'Baked Today', 'assets/images/sourdough.svg'),
('French Butter Croissants', 'Bakery', 'Box of 4 Pastries', 5.99, 28, 'Popular', 'assets/images/croissants.svg'),
('Norwegian Atlantic Salmon Fillet', 'Meat & Seafood', '400g Vacuum Pack', 12.99, 18, 'Wild Caught', 'assets/images/salmon.svg'),
('Grass-Fed Beef Ribeye Steak', 'Meat & Seafood', '350g Cut', 14.50, 15, 'Prime Cut', 'assets/images/steak.svg'),
('Cold-Pressed Valencia Orange Juice', 'Pantry & Drinks', '1 Liter Carafe', 4.50, 40, '100% Pure', 'assets/images/orange-juice.svg'),
('Extra Virgin Olive Oil', 'Pantry & Drinks', '500ml Glass Bottle', 9.99, 30, 'Cold Pressed', 'assets/images/olive-oil.svg');
