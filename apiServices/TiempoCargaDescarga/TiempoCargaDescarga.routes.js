const { Router } = require('express');
const router = new Router();

const TiempoCargaDescarga = require('./TiempoCargaDescarga.controller');

router.get('/api/tiemposCargaDescarga', TiempoCargaDescarga.get);
router.get('/api/tiemposCargaDescarga/:_id', TiempoCargaDescarga.getById);
router.post('/api/tiempoCargaDescarga', TiempoCargaDescarga.save);
router.put('/api/tiempoCargaDescarga/:_id', TiempoCargaDescarga.update);
router.delete('/api/tiempoCargaDescarga/:_id', TiempoCargaDescarga._delete);

module.exports = router;