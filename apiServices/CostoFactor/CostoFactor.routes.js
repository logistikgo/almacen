const { Router } = require('express');
const router = new Router();

const CostoFactor = require('./CostoFactor.controller');

router.get('/api/costosFactor', CostoFactor.get);
router.get('/api/costoFactor/:_id', CostoFactor.getById);
router.post('/api/costoFactor', CostoFactor.save);
router.put('/api/costoFactor/:_id', CostoFactor.update);
router.delete('/api/costoFactor/:_id', CostoFactor._delete);

module.exports = router;