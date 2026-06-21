-- schema.sql
CREATE DATABASE IF NOT EXISTS hiretrack;
USE hiretrack;

CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_name VARCHAR(100) NOT NULL,
  role_title VARCHAR(100) NOT NULL,
  status ENUM('Applied', 'Interview', 'Offer', 'Rejected') DEFAULT 'Applied',
  applied_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


INSERT INTO applications (company_name, role_title, status, applied_date) VALUES
('Cognizant', 'SDE Intern', 'Interview', '2026-06-12'),
('Capgemini', 'Java Dev', 'Applied', '2026-06-09'),
('eQ Technologic', 'Spring Boot Dev', 'Offer', '2026-06-03');