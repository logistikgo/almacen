const { Router } = require('express');
const router = new Router();

const EntradaBabel = require('./EntradaBabel.controller');
//babel
//entradas
router.post('/api/saveEntradaBabel', EntradaBabel.saveEntradaBabel);
router.post('/api/updateEntradasBabel', EntradaBabel.updateEntradasBabel);
router.post('/api/saveEntradaEDI', EntradaBabel.saveEntradaEDI);
router.post('/api/saveEntradaCPD', EntradaBabel.saveEntradaCPD);
router.post('/api/saveEntradaBLO', EntradaBabel.saveEntradaBLO);
router.post('/api/updateById', EntradaBabel.updateById);
router.post('/api/saveEntradaChevron',EntradaBabel.saveEntradaChevron);

module.exports = router;