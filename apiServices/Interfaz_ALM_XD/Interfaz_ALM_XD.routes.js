const { Router } = require('express');
const router = new Router();

const Interfaz_ALM_XD = require('./Interfaz_ALM_XD.controller');

router.get('/api/getSucursalALM', Interfaz_ALM_XD.getIDSucursalALMAPI);

module.exports = router;