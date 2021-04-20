const { Router } = require('express');
const router = new Router();

const Pasillo = require('./Pasillo.controller');

router.get('/api/pasillos', Pasillo.get);
router.get('/api/pasillosDisponibles', Pasillo.getDisponibles);
router.get('/api/pasillo', Pasillo.getById);
router.get('/api/posicionesNom', Pasillo.getPosiciones);

module.exports = router;