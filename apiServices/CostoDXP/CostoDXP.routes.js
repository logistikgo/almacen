const { Router } = require('express');
const router = new Router();

const CostoDXP = require('./CostoDXP.controller');

router.get('/api/costosDXP', CostoDXP.get);
router.get('/api/costoDXP/:_id', CostoDXP.getById);
router.post('/api/costoDXP', CostoDXP.save);
router.put('/api/costoDXP/:_id', CostoDXP.update);
router.delete('/api/costoDXP/:_id', CostoDXP._delete);

module.exports = router;