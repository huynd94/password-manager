import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from './db';
import { authenticate, signToken } from './auth';

const router = Router();

// POST /api/register
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    // Check if username exists
    const existing = await pool.query('SELECT id FROM users WHERE username=$1 LIMIT 1', [username]);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [username, password_hash]);

    return res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'username and password are required' });
    }

    const userRes = await pool.query('SELECT id, password_hash FROM users WHERE username=$1 LIMIT 1', [username]);
    if (userRes.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const { id, password_hash } = userRes.rows[0] as { id: string; password_hash: string };
    const match = await bcrypt.compare(password, password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = signToken(id);
    return res.status(200).json({ token });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/accounts
router.get('/accounts', authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const result = await pool.query('SELECT encrypted_vault FROM users WHERE id=$1 LIMIT 1', [userId]);
    const encrypted_vault = result.rowCount > 0 ? result.rows[0].encrypted_vault : null;
    return res.status(200).json({ encrypted_vault });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/accounts
router.post('/accounts', authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId as string;
    const { encrypted_vault } = req.body || {};
    if (typeof encrypted_vault !== 'string') {
      return res.status(400).json({ message: 'encrypted_vault must be a string' });
    }

    await pool.query('UPDATE users SET encrypted_vault=$1 WHERE id=$2', [encrypted_vault, userId]);
    return res.status(200).json({ message: 'Vault updated successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
