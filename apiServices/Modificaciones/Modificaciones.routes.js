const { Router } = require('express');
const router = new Router();

const Modificaciones = require('./Modificaciones.controller');

//Bitacora modificaciones
router.get('/api/modificaciones', Modificaciones.get);

module.exports = router;