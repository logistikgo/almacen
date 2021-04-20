const { Router } = require('express');
const router = new Router();

const Entrada = require('../Entradas/Entrada.controller');
//babel
//entradas
router.post('/api/saveEntradaBabel', Entrada.saveEntradaBabel);
router.post('/api/updateEntradasBabel', Entrada.updateEntradasBabel);
router.post('/api/saveEntradaEDI', Entrada.saveEntradaEDI);
router.post('/api/saveEntradaCPD', Entrada.saveEntradaCPD);
router.post('/api/saveEntradaBLO', Entrada.saveEntradaBLO);
router.post('/api/updateById', Entrada.updateById);
router.post('/api/saveEntradaChevron',Entrada.saveEntradaChevron);

module.exports = router;