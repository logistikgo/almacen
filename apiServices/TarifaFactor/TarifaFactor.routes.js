const { Router } = require('express');
const router = new Router();

const TarifaFactor = require('./TarifaFactor.controller');

router.get('/api/tarifaFactor', TarifaFactor.get);
router.get('/api/tarifaFactor/cliente/:cliente_id', TarifaFactor.getByCliente);
router.post('/api/tarifaFactor', TarifaFactor.post);
router.put('/api/tarifaFactor', TarifaFactor.put);
router.delete('/api/tarifaFactor/:_id', TarifaFactor._delete);

module.exports = router;