const { Router } = require('express');
const router = new Router();

const CostoFija = require('./CostoFija.controller');

router.get('/api/costosFija', CostoFija.get);
router.get('/api/costoFija/:_id', CostoFija.getById);
router.post('/api/costoFija', CostoFija.save);
router.put('/api/costoFija/:_id', CostoFija.update);
router.delete('/api/costoFija/:_id', CostoFija._delete);

module.exports = router;