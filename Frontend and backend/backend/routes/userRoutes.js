import express from 'express';
import { getUsers } from '../controllers/accountController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getUsers);

export default router;
