// src/controllers/auth.js

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const secretKey = 'your-256-bit-secret';

// Ruta para generar el token
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Validar las credenciales (esto es solo un ejemplo)
    if (username === 'user' && password === 'password') {
        const payload = {
            username: username,
            role: 'user'
        };

        // Generar el token
        const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });
        res.json({ token: token });
    } else {
        res.status(401).json({ error: 'Credenciales inválidas' });
    }
});

// Middleware para verificar el token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ error: 'No se proporcionó un token' });
    }

    const token = authHeader.split(' ')[1]; // Extract Bearer token
    if (!token) {
        return res.status(403).json({ error: 'Formato de token inválido' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            console.error('Error al verificar el token:', err);
            return res.status(500).json({ error: 'Error al verificar el token' });
        }
        req.user = decoded;
        next();
    });
};

module.exports = { router, verifyToken };
