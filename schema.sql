-- schema.sql

CREATE TABLE IF NOT EXISTS resumes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY idx_user_title_version (user_id, title, version),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  company_name VARCHAR(100) NOT NULL,
  role_title VARCHAR(100) NOT NULL,
  status ENUM('Applied', 'Interview', 'Offer', 'Rejected') DEFAULT 'Applied',
  applied_date DATE NOT NULL,
  notes TEXT,
  resume_id INT DEFAULT NULL,
  resume_file_name VARCHAR(255) DEFAULT NULL,
  resume_file_url VARCHAR(500) DEFAULT NULL,
  resume_uploaded_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;