CREATE DATABASE IF NOT EXISTS yz_blog 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE yz_blog;

-- Table des administrateurs
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Table des articles
CREATE TABLE IF NOT EXISTS articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    summary VARCHAR(500),
    image_url VARCHAR(512),
    source VARCHAR(512), -- NOUVEAU CHAMP POUR LA SOURCE
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_published BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- Table des commentaires
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT NOT NULL,
    content TEXT NOT NULL,
    author_name VARCHAR(100) DEFAULT 'Anonyme',
    email VARCHAR(255) NOT NULL, -- Le backend s'attend à un email pour les commentaires
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    INDEX idx_article_id (article_id) -- Index pour la performance
) ENGINE=InnoDB;

--- Table de contacts des messages
CREATE TABLE IF NOT EXISTS contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

USE yz_blog;

-- Insertion de l'admin par défaut
INSERT INTO admin_users (email, password_hash) 
VALUES (
    'junior.efrancel@gmail.com', 
    '$2b$10$Ieis7fkqjrRiZW6tgNBzlO9TrsBgf4qZM2NiHKMsdpcB.dV4B57di' -- Hash correspond au mot de passe '#Ez8542Blog'
);

-- Index pour les recherches sur les titres d'articles
CREATE INDEX idx_articles_title ON articles(title);