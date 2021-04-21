const { Router } = require('express');
const router = new Router();

const TarifaFija = require('./TarifaFija.controller');

router.get('/api/tarifaFija', TarifaFija.get);
router.get('/api/tarifaFija/:_id', TarifaFija.getByID);
router.get('/api/tarifaFijacliente', TarifaFija.getByCliente);
router.post('/api/tarifaFija', TarifaFija.save);
router.delete('/api/tarifaFija/:_id', TarifaFija._delete);

module.exports = router;