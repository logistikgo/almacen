const { Router } = require('express');
const router = new Router();

const CostoPES = require('./CostoPES.controller');

router.get('/api/costosPES', CostoPES.get);
router.get('/api/costoPES/:_id', CostoPES.getById);
router.post('/api/costoPES', CostoPES.save);
router.put('/api/costoPES/:_id', CostoPES.update);
router.delete('/api/costoPES/:_id', CostoPES._delete);

module.exports = router;