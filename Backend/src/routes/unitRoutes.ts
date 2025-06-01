import express from 'express';
import { UnitController } from '../controllers/unitController';

const router = express.Router();

// Get all units
router.get('/', UnitController.getAll);

// Get unit by ID
router.get('/:id', UnitController.getById);

// Create new unit
router.post('/', UnitController.create);

// Update unit
router.put('/:id', UnitController.update);

// Delete unit
router.delete('/:id', UnitController.delete);

export default router; 