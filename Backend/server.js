// Backend/server.js (nouvelle version corrigée)
require('dotenv').config();
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { parse } = require('querystring');
const db = require('./database');
const multer = require('multer');

const PORT = process.env.PORT || 3000;

// Configuration de Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads/images');
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
});

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Erreur: Seules les images (jpeg, jpg, png, gif) sont autorisées!');
    }
}

async function parseUrlEncodedBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(parse(body));
            } catch (err) {
                reject(err);
            }
        });
        req.on('error', err => reject(err));
    });
}

async function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                if (body.trim() === '') return resolve({});
                reject(err);
            }
        });
        req.on('error', err => reject(err));
    });
}

function isAuthenticated(req) {
    const cookie = req.headers.cookie;
    if (!cookie) return false;
    const token = cookie.split('auth_token=')[1]?.split(';')[0];
    return !!token;
}

function sendResponse(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

async function handleApiRequest(req, res) {
    const { pathname, query } = url.parse(req.url, true);
    const method = req.method;

    try {
        // Routes Publiques
        if (pathname === '/api/login' && method === 'POST') {
            const body = await parseUrlEncodedBody(req);
            if (!body.email || !body.password) {
                return sendResponse(res, 400, { error: 'Email et mot de passe requis.' });
            }
            const [users] = await db.execute('SELECT * FROM admin_users WHERE email = ?', [body.email]);
            if (users.length === 0 || !await bcrypt.compare(body.password, users[0].password_hash)) {
                return sendResponse(res, 401, { error: 'Identifiants invalides' });
            }
            const token = Buffer.from(`${users[0].id}:${Date.now()}:${Math.random()}`).toString('base64');
            res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Path=/; Max-Age=${60*60*24}; SameSite=Lax`);
            return sendResponse(res, 200, { message: 'Connexion réussie', userId: users[0].id });
        }

        if (pathname === '/api/contact' && method === 'POST') {
            const body = await parseJsonBody(req);
            if (!body.email || !body.message) {
                return sendResponse(res, 400, { error: 'Email et message sont requis.' });
            }
            if (!/\S+@\S+\.\S+/.test(body.email)) {
                 return sendResponse(res, 400, { error: 'Format d\'email invalide.' });
            }
            try {
                const [result] = await db.execute(
                    'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
                    [body.name || null, body.email, body.subject || null, body.message]
                );
                return sendResponse(res, 201, { message: 'Message de contact reçu avec succès !', id: result.insertId });
            } catch (dbError) {
                console.error('Erreur lors de l\'insertion du message de contact :', dbError);
                return sendResponse(res, 500, { error: 'Erreur serveur lors de l\'enregistrement du message.' });
            }
        }

        if (method === 'GET' && pathname === '/api/articles') {
            const [articles] = await db.execute('SELECT id, title, summary, image_url, created_at, source FROM articles WHERE is_published = TRUE ORDER BY created_at DESC');
            return sendResponse(res, 200, articles);
        }

        const publicArticleMatch = pathname.match(/^\/api\/articles\/(\d+)$/);
        if (method === 'GET' && publicArticleMatch) {
            const articleId = publicArticleMatch[1];
            const [articleRows] = await db.execute('SELECT * FROM articles WHERE id = ? AND is_published = TRUE', [articleId]);
            if (articleRows.length === 0) return sendResponse(res, 404, { error: 'Article non trouvé ou non publié' });
            return sendResponse(res, 200, articleRows[0]);
        }

        const commentsMatch = pathname.match(/^\/api\/articles\/(\d+)\/comments$/);
        if (method === 'GET' && commentsMatch) {
            const articleId = commentsMatch[1];
            const [comments] = await db.execute(
                'SELECT id, content, author_name, created_at FROM comments WHERE article_id = ? ORDER BY created_at DESC',
                [articleId]
            );
            return sendResponse(res, 200, comments);
        }

        if (method === 'POST' && commentsMatch) {
            const articleId = commentsMatch[1];
            const body = await parseJsonBody(req);
            if (!body.content || !body.email) {
                return sendResponse(res, 400, { error: 'Contenu et email requis pour le commentaire' });
            }
            if (!/\S+@\S+\.\S+/.test(body.email)) {
                 return sendResponse(res, 400, { error: 'Format d\'email invalide.' });
            }
            await db.execute(
                'INSERT INTO comments (article_id, content, author_name, email) VALUES (?, ?, ?, ?)',
                [articleId, body.content, body.author_name || 'Anonyme', body.email]
            );
            return sendResponse(res, 201, { message: 'Commentaire ajouté' });
        }

        // Routes Protégées
        if (pathname === '/api/articles' && method === 'POST') {
            upload.single('image')(req, res, async (err) => {
                if (!isAuthenticated(req)) return sendResponse(res, 401, { error: 'Non autorisé' });
                if (err) {
                    if (err instanceof multer.MulterError) return sendResponse(res, 400, { error: `Erreur Multer: ${err.message}` });
                    return sendResponse(res, 400, { error: err.message || err });
                }

                const { title, content, summary, source } = req.body;
                if (!title || !content) return sendResponse(res, 400, { error: 'Titre et contenu sont requis.' });

                const imageUrl = req.file ? `/uploads/images/${req.file.filename}` : null;
                const [result] = await db.execute(
                    'INSERT INTO articles (title, content, summary, image_url, source) VALUES (?, ?, ?, ?, ?)',
                    [title, content, summary || null, imageUrl, source || null]
                );
                return sendResponse(res, 201, { message: 'Article créé', id: result.insertId, imageUrl });
            });
            return;
        }

        const articleAdminMatch = pathname.match(/^\/api\/articles\/(\d+)$/);
        if (articleAdminMatch) {
            const articleId = articleAdminMatch[1];
            if (!isAuthenticated(req)) return sendResponse(res, 401, { error: 'Non autorisé' });

            if (method === 'PUT') {
                upload.single('image')(req, res, async (err) => {
                    if (err) {
                         if (err instanceof multer.MulterError) return sendResponse(res, 400, { error: `Erreur Multer: ${err.message}` });
                         return sendResponse(res, 400, { error: err.message || err });
                    }

                    const { title, content, summary, currentImage, remove_image, source } = req.body;
                     if (!title || !content) return sendResponse(res, 400, { error: 'Titre et contenu sont requis.' });

                    let imageUrl = currentImage || null;
                    if (req.file) {
                        imageUrl = `/uploads/images/${req.file.filename}`;
                        if (currentImage && currentImage.startsWith('/uploads/images/')) {
                            const oldImagePath = path.join(__dirname, currentImage);
                            fs.unlink(oldImagePath, (unlinkErr) => {
                                if (unlinkErr && unlinkErr.code !== 'ENOENT') console.error("Erreur suppression ancienne image:", unlinkErr);
                            });
                        }
                    } else if (remove_image === 'true') {
                        if (currentImage && currentImage.startsWith('/uploads/images/')) {
                            const oldImagePath = path.join(__dirname, currentImage);
                            fs.unlink(oldImagePath, (unlinkErr) => {
                                if (unlinkErr && unlinkErr.code !== 'ENOENT') console.error("Erreur suppression image:", unlinkErr);
                            });
                        }
                        imageUrl = null;
                    }

                    await db.execute(
                        'UPDATE articles SET title = ?, content = ?, summary = ?, image_url = ?, source = ? WHERE id = ?',
                        [title, content, summary || null, imageUrl, source || null, articleId]
                    );
                    return sendResponse(res, 200, { message: 'Article mis à jour', imageUrl });
                });
                return;
            }

            if (method === 'DELETE') {
                const [articleRows] = await db.execute('SELECT image_url FROM articles WHERE id = ?', [articleId]);
                if (articleRows.length > 0 && articleRows[0].image_url && articleRows[0].image_url.startsWith('/uploads/images/')) {
                    const imagePath = path.join(__dirname, articleRows[0].image_url);
                    fs.unlink(imagePath, (unlinkErr) => {
                        if (unlinkErr && unlinkErr.code !== 'ENOENT') console.error("Erreur suppression image article:", unlinkErr);
                    });
                }
                await db.execute('DELETE FROM articles WHERE id = ?', [articleId]);
                return sendResponse(res, 200, { message: 'Article supprimé' });
            }
        }
        
        if (pathname.startsWith('/api/')) {
             return sendResponse(res, 404, { error: 'Route API non trouvée ou méthode non supportée' });
        }

    } catch (error) {
        console.error('Erreur API:', error);
        if (!res.headersSent) {
            return sendResponse(res, 500, { error: 'Erreur serveur interne. Veuillez vérifier les logs.' });
        }
    }
}

function serveStaticFile(req, res) {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    let filePath;

    if (pathname.startsWith('/uploads/images/')) {
        const requestedPath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        filePath = path.join(__dirname, requestedPath);
    } else {
        if (pathname === '/') pathname = '/index.html';
        filePath = path.join(__dirname, '../Frontend', pathname);
    }

    const extname = path.extname(filePath);
    const mimeTypes = {
        '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
        '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
    };
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                if (pathname.startsWith('/api/')) {
                   if (!res.headersSent) sendResponse(res, 404, { error: 'Route API non trouvée' });
                } else {
                    fs.readFile(path.join(__dirname, '../Frontend/404.html'), (err404, content404) => {
                        if (res.headersSent) return;
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        if (err404) {
                            res.end('404 Not Found');
                        } else {
                            res.end(content404, 'utf-8');
                        }
                    });
                }
            } else {
                if (res.headersSent) return;
                res.writeHead(500);
                res.end(`Erreur serveur: ${err.code}`);
            }
        } else {
            if (res.headersSent) return;
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}

const server = http.createServer(async (req, res) => {
    const { pathname } = url.parse(req.url, true);

    if (pathname.startsWith('/api')) {
        await handleApiRequest(req, res);
    } else {
        serveStaticFile(req, res);
    }
});

server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
    console.log('Endpoints API principaux:');
    console.log(`- AUTH:  POST   /api/login`);
    console.log(`- PUBLIC: POST  /api/contact`);
    console.log(`- PUBLIC: GET    /api/articles`);
    console.log(`- PUBLIC: GET    /api/articles/:id`);
    console.log(`- PUBLIC: GET    /api/articles/:id/comments`);
    console.log(`- PUBLIC: POST   /api/articles/:id/comments`);
    console.log(`- ADMIN:  POST   /api/articles (multipart/form-data avec champ 'image')`);
    console.log(`- ADMIN:  PUT    /api/articles/:id (multipart/form-data avec champ 'image')`);
    console.log(`- ADMIN:  DELETE /api/articles/:id`);
    console.log('Les fichiers uploadés seront servis depuis /uploads/images/');
});