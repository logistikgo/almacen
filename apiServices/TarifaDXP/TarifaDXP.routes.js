const { Router } = require('express');
const router = new Router();

const TarifaDXP = require('./TarifaDXP.controller');

router.get('/api/tarifaDXP', TarifaDXP.get);
router.get('/api/tarifaDXP/:_id', TarifaDXP.getByID);
router.get('/api/tarifaDXP/cliente/:cliente_id', TarifaDXP.getByCliente);
router.post('/api/tarifaDXP', TarifaDXP.save);
router.delete('/api/tarifaDXP/:_id', TarifaDXP._delete);

module.exports = router;